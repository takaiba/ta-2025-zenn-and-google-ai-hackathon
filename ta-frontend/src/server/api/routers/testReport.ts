import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";
import { createGeminiClient } from "../../../lib/gemini";

export const testReportRouter = createTRPCRouter({
  get: protectedUserProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true }
      });

      if (!account) {
        throw new TRPCError({ 
          code: "UNAUTHORIZED",
          message: "アカウントが見つかりません" 
        });
      }

      // Check if user has access to the report through project membership
      const report = await ctx.db.testReport.findFirst({
        where: { 
          id: input.id,
          testSession: {
            project: {
              members: {
                some: {
                  accountId: account.id
                }
              }
            }
          }
        },
        include: {
          testSession: {
            include: {
              project: true,
            },
          },
          account: true,
        },
      });

      if (!report) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "レポートが見つかりません" 
        });
      }

      return report;
    }),

  getAll: protectedUserProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        testSessionId: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get the account to access accountId
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true }
      });

      if (!account) {
        throw new TRPCError({ 
          code: "UNAUTHORIZED",
          message: "アカウントが見つかりません" 
        });
      }

      const where: any = {
        testSession: {
          project: {
            members: {
              some: {
                accountId: account.id
              }
            }
          },
        },
      };

      if (input.projectId) {
        where.testSession.projectId = input.projectId;
      }
      if (input.testSessionId) {
        where.testSessionId = input.testSessionId;
      }

      const [reports, total] = await Promise.all([
        ctx.db.testReport.findMany({
          where,
          include: {
            testSession: {
              include: {
                project: true,
              },
            },
            account: true,
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.testReport.count({ where }),
      ]);

      return {
        reports,
        total,
        hasMore: total > input.offset + input.limit,
      };
    }),

  create: protectedUserProcedure
    .input(
      z.object({
        testSessionId: z.string(),
        language: z.enum(["ja", "en"]).default("ja"),
        reportContent: z.string(),
        summary: z.any(), // Json field
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the account to access accountId
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true }
      });

      if (!account) {
        throw new TRPCError({ 
          code: "UNAUTHORIZED",
          message: "アカウントが見つかりません" 
        });
      }

      return ctx.db.testReport.create({
        data: {
          testSessionId: input.testSessionId,
          accountId: account.id,
          language: input.language,
          reportContent: input.reportContent,
          summary: input.summary,
        },
      });
    }),

  generate: protectedUserProcedure
    .input(z.object({ testSessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the account to access accountId and organizationId
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true, organizationId: true }
      });

      if (!account) {
        throw new TRPCError({ 
          code: "UNAUTHORIZED",
          message: "アカウントが見つかりません" 
        });
      }

      // Get test session with all related data
      const testSession = await ctx.db.testSession.findUnique({
        where: { id: input.testSessionId },
        include: {
          project: true,
          testResults: {
            include: {
              bugTickets: true,
            }
          },
          sessionLogs: {
            orderBy: { createdAt: 'desc' }
          },
          bugTickets: {
            include: {
              comments: true,
            }
          }
        }
      });

      if (!testSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "テストセッションが見つかりません"
        });
      }

      // Check project access through membership
      const projectMember = await ctx.db.projectMember.findFirst({
        where: {
          projectId: testSession.projectId,
          accountId: account.id
        }
      });

      if (!projectMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "このテストセッションへのアクセス権限がありません"
        });
      }

      // Get GEMINI_API_KEY from environment
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gemini APIキーが設定されていません"
        });
      }

      // Prepare data for report generation
      const reportData = {
        sessionId: testSession.id,
        projectName: testSession.project.name,
        testResults: testSession.testResults,
        bugs: testSession.bugTickets,
        logs: testSession.sessionLogs,
        screenshots: testSession.sessionLogs
          .filter(log => log.screenshot && log.screenshot.trim() !== '')
          .map(log => log.screenshot as string)
      };

      try {
        // Generate report using Gemini API
        const geminiClient = createGeminiClient(geminiApiKey);
        const reportContent = await geminiClient.generateTestReport(reportData);

        // Create summary data
        const summary = {
          testSessionId: testSession.id,
          projectName: testSession.project.name,
          totalTests: testSession.testResults.length,
          passedTests: testSession.testResults.filter(r => r.status === 'passed').length,
          failedTests: testSession.testResults.filter(r => r.status === 'failed').length,
          totalBugs: testSession.bugTickets.length,
          criticalBugs: testSession.bugTickets.filter(b => b.severity === 'critical').length,
          highBugs: testSession.bugTickets.filter(b => b.severity === 'high').length,
          mediumBugs: testSession.bugTickets.filter(b => b.severity === 'medium').length,
          lowBugs: testSession.bugTickets.filter(b => b.severity === 'low').length,
          generatedAt: new Date().toISOString(),
        };

        // Save report to database
        const testReport = await ctx.db.testReport.create({
          data: {
            testSessionId: input.testSessionId,
            accountId: account.id,
            language: 'ja',
            reportContent: reportContent,
            summary: summary,
          },
          include: {
            testSession: {
              include: {
                project: true,
              },
            },
            account: true,
          },
        });

        return testReport;
      } catch (error) {
        console.error('Report generation error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "レポートの生成に失敗しました"
        });
      }
    }),

  delete: protectedUserProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true }
      });

      if (!account) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Check if user has permission to delete (owner or project admin)
      const report = await ctx.db.testReport.findFirst({
        where: {
          id: input.id,
          OR: [
            { accountId: account.id }, // Report owner
            {
              testSession: {
                project: {
                  members: {
                    some: {
                      accountId: account.id,
                      role: { in: ["owner", "admin"] }
                    }
                  }
                }
              }
            }
          ]
        }
      });

      if (!report) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "レポートを削除する権限がありません" 
        });
      }

      return ctx.db.testReport.delete({
        where: { id: input.id },
      });
    }),
});

export type TestReportRouter = typeof testReportRouter;