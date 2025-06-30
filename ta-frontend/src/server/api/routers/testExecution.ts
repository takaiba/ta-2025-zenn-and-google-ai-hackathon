import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const testExecutionRouter = createTRPCRouter({
  // Start a new test execution
  start: protectedUserProcedure
    .input(
      z.object({
        projectId: z.string(),
        testConfigId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      // Verify project belongs to organization
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: account.organizationId
        }
      });

      if (!project) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "プロジェクトが見つかりません" 
        });
      }

      // Verify test config belongs to project
      const testConfig = await ctx.db.testConfig.findFirst({
        where: {
          id: input.testConfigId,
          projectId: input.projectId
        }
      });

      if (!testConfig) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "テスト設定が見つかりません" 
        });
      }

      // Check organization limits
      const organization = await ctx.db.organization.findUnique({
        where: { id: account.organizationId },
        select: { 
          monthlyTestLimit: true,
          projects: {
            select: {
              _count: {
                select: {
                  testSessions: {
                    where: {
                      createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (organization) {
        // Count total test sessions across all projects
        const totalTestSessions = organization.projects.reduce(
          (sum, project) => sum + project._count.testSessions, 
          0
        );

        if (totalTestSessions >= organization.monthlyTestLimit) {
          throw new TRPCError({ 
            code: "FORBIDDEN",
            message: "月間テスト実行数の上限に達しています" 
          });
        }
      }

      // Create test session
      const testSession = await ctx.db.testSession.create({
        data: {
          accountId: account.id,
          projectId: input.projectId,
          testConfigId: input.testConfigId,
          status: "pending",
        },
        include: {
          project: true,
          testConfig: true
        }
      });

      // Create job queue entry for test execution
      await ctx.db.jobQueue.create({
        data: {
          type: "test_execution",
          status: "pending",
          priority: 5,
          testSessionId: testSession.id,
          payload: {
            projectId: input.projectId,
            testConfigId: input.testConfigId,
            sessionId: testSession.id,
            accountId: account.id
          }
        }
      });

      return {
        sessionId: testSession.id,
        message: "テストを開始しました"
      };
    }),

  // Stop a running test
  stop: protectedUserProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      // Verify session belongs to organization
      const session = await ctx.db.testSession.findFirst({
        where: {
          id: input.sessionId,
          project: {
            organizationId: account.organizationId
          }
        }
      });

      if (!session) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "テストセッションが見つかりません" 
        });
      }

      if (session.status !== "running") {
        throw new TRPCError({ 
          code: "BAD_REQUEST",
          message: "実行中のテストのみ停止できます" 
        });
      }

      // Update session status to cancelled
      await ctx.db.testSession.update({
        where: { id: input.sessionId },
        data: {
          status: "failed",
          completedAt: new Date(),
          errorMessage: "ユーザーによってキャンセルされました"
        }
      });

      // Update related job queue entry
      await ctx.db.jobQueue.updateMany({
        where: {
          testSessionId: input.sessionId,
          status: { in: ["pending", "processing"] }
        },
        data: {
          status: "cancelled",
          completedAt: new Date(),
          error: "ユーザーによってキャンセルされました"
        }
      });

      return {
        message: "テストを停止しました"
      };
    }),

  // Get test execution status
  getStatus: protectedUserProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
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

      const session = await ctx.db.testSession.findFirst({
        where: {
          id: input.sessionId,
          project: {
            organizationId: account.organizationId
          }
        },
        include: {
          _count: {
            select: {
              testResults: true,
              bugTickets: true
            }
          }
        }
      });

      if (!session) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "テストセッションが見つかりません" 
        });
      }

      // Calculate progress (mock data for now)
      const progress = session.status === "completed" ? 100 : 
                      session.status === "running" ? Math.min(90, session._count.testResults * 10) : 
                      0;

      return {
        status: session.status,
        progress,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        pagesVisited: session._count.testResults,
        bugsFound: session._count.bugTickets,
        mlSessionId: null
      };
    }),
});

export type TestExecutionRouter = typeof testExecutionRouter;