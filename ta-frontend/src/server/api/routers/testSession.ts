import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { 
  createTRPCRouter, 
  protectedUserProcedure,
} from "../trpc";

export const testSessionRouter = createTRPCRouter({
  // Get single test session
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

      const testSession = await ctx.db.testSession.findFirst({ 
        where: { 
          id: input.id,
          project: {
            members: {
              some: {
                accountId: account.id
              }
            }
          }
        },
        include: {
          project: true,
          testConfig: true,
          account: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          bugTickets: {
            include: {
              _count: {
                select: { comments: true }
              }
            },
            orderBy: { createdAt: "desc" }
          },
          reports: true,
          _count: {
            select: { 
              testResults: true,
              sessionLogs: true,
              bugTickets: true
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

      return testSession;
    }),

  // Get all test sessions for a project
  getAllByProject: protectedUserProcedure
    .input(
      z.object({ 
        projectId: z.string(),
        status: z.enum(["all", "pending", "running", "completed", "failed"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
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

      // Verify user has access to project through ProjectMember
      const projectMember = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          accountId: account.id
        }
      });

      if (!projectMember) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "プロジェクトが見つかりません" 
        });
      }
      
      // statusがundefinedまたは"all"の場合は条件に含めない
      const where: any = {
        projectId: input.projectId,
      };
      
      if (input.status && input.status !== "all") {
        where.status = input.status;
      }

      const result = await ctx.db.$transaction(async (tx) => {
        const sessions = await tx.testSession.findMany({
          where,
          include: {
            account: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            testConfig: {
              select: {
                name: true,
                mode: true
              }
            },
            _count: {
              select: { 
                bugTickets: true,
                testResults: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        });
        const total = await tx.testSession.count({ where });
        return { sessions, total };
      });

      return {
        sessions: result.sessions,
        total: result.total,
        hasMore: result.total > input.offset + input.limit
      };
    }),

  // Get recent test sessions across all projects
  getRecent: protectedUserProcedure
    .input(
      z.object({ 
        limit: z.number().min(1).max(10).default(5),
      })
    )
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
      
      // Get all project IDs that the user has access to
      const projectMembers = await ctx.db.projectMember.findMany({
        where: { accountId: account.id },
        select: { projectId: true }
      });

      const projectIds = projectMembers.map(pm => pm.projectId);
      
      return ctx.db.testSession.findMany({
        where: {
          projectId: { in: projectIds }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          account: {
            select: {
              name: true,
              email: true
            }
          },
          _count: {
            select: { 
              bugTickets: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  // Get all running test sessions across user's projects
  getAllRunning: protectedUserProcedure
    .query(async ({ ctx }) => {
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
      
      // Get all project IDs that the user has access to
      const projectMembers = await ctx.db.projectMember.findMany({
        where: { accountId: account.id },
        select: { projectId: true }
      });

      const projectIds = projectMembers.map(pm => pm.projectId);
      
      return ctx.db.testSession.findMany({
        where: {
          status: "running",
          projectId: { in: projectIds }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          account: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          testConfig: {
            select: {
              name: true,
              mode: true
            }
          },
          _count: {
            select: { 
              bugTickets: true,
              testResults: true
            }
          }
        },
        orderBy: { startedAt: "desc" }
      });
    }),

  // Create test session (start new test)
  create: protectedUserProcedure
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
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Check project membership
      const member = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          accountId: account.id
        }
      });

      if (!member) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "プロジェクトへのアクセス権限がありません" 
        });
      }

      // Check usage limits
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const result = await ctx.db.$transaction(async (tx) => {
        const organization = await tx.organization.findUnique({
          where: { id: account.organizationId },
          select: { monthlyTestLimit: true, plan: true }
        });
        const currentUsage = await tx.usageStats.findUnique({
          where: {
            organizationId_month: {
              organizationId: account.organizationId,
              month: currentMonth
            }
          }
        });
        return { organization, currentUsage };
      });

      if (result.organization && result.currentUsage && 
          result.organization.plan === "free" && 
          result.currentUsage.testSessionCount >= result.organization.monthlyTestLimit) {
        throw new TRPCError({ 
          code: "PRECONDITION_FAILED",
          message: "月間のテスト実行回数上限に達しました" 
        });
      }

      // Create test session
      const testSession = await ctx.db.testSession.create({
        data: {
          projectId: input.projectId,
          testConfigId: input.testConfigId,
          accountId: account.id,
          status: "pending",
        },
      });

      // Update usage stats
      await ctx.db.usageStats.upsert({
        where: {
          organizationId_month: {
            organizationId: account.organizationId,
            month: currentMonth
          }
        },
        update: {
          testSessionCount: { increment: 1 }
        },
        create: {
          organizationId: account.organizationId,
          month: currentMonth,
          testSessionCount: 1,
          bugReportCount: 0,
          totalTestMinutes: 0
        }
      });

      // TODO: Call ML backend to start test execution
      // await startTestExecution(testSession.id);

      return testSession;
    }),

  // Cancel test session
  cancel: protectedUserProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true }
      });

      if (!account) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const testSession = await ctx.db.testSession.findUnique({
        where: { id: input.id },
        select: { 
          status: true,
          accountId: true,
          project: {
            select: {
              members: {
                where: { accountId: account.id }
              }
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

      // Check permission (creator or project member)
      if (testSession.accountId !== account.id && 
          testSession.project.members.length === 0) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "テストセッションをキャンセルする権限がありません" 
        });
      }

      if (!["pending", "running"].includes(testSession.status)) {
        throw new TRPCError({ 
          code: "PRECONDITION_FAILED",
          message: "完了済みのテストセッションはキャンセルできません" 
        });
      }

      // Update status
      const updatedSession = await ctx.db.testSession.update({
        where: { id: input.id },
        data: { 
          status: "failed",
          completedAt: new Date(),
          errorMessage: "ユーザーによってキャンセルされました"
        },
      });

      // TODO: Call ML backend to stop test execution
      // await stopTestExecution(input.id);

      return updatedSession;
    }),

  // Delete test session
  delete: protectedUserProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

      // Check if test session exists and user has access through project membership
      const testSession = await ctx.db.testSession.findFirst({ 
        where: { 
          id: input.id,
          project: {
            members: {
              some: {
                accountId: account.id
              }
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

      // Delete related data in transaction
      await ctx.db.$transaction(async (tx) => {
        // Delete test session logs
        await tx.testSessionLog.deleteMany({
          where: { testSessionId: input.id }
        });

        // Delete test results
        await tx.testResult.deleteMany({
          where: { testSessionId: input.id }
        });

        // Delete bug comments first (due to foreign key)
        const bugTickets = await tx.bugTicket.findMany({
          where: { testSessionId: input.id },
          select: { id: true }
        });
        
        for (const ticket of bugTickets) {
          await tx.bugComment.deleteMany({
            where: { bugTicketId: ticket.id }
          });
        }

        // Delete bug tickets
        await tx.bugTicket.deleteMany({
          where: { testSessionId: input.id }
        });

        // Delete test reports
        await tx.testReport.deleteMany({
          where: { testSessionId: input.id }
        });

        // Delete job queues
        await tx.jobQueue.deleteMany({
          where: { testSessionId: input.id }
        });

        // Finally delete the test session
        await tx.testSession.delete({
          where: { id: input.id }
        });
      });

      return { success: true };
    }),

  // Get test session logs
  getLogs: protectedUserProcedure
    .input(
      z.object({ 
        sessionId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
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

      // Verify user has access to the test session through project membership
      const testSession = await ctx.db.testSession.findFirst({
        where: {
          id: input.sessionId,
          project: {
            members: {
              some: {
                accountId: account.id
              }
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

      return ctx.db.testSessionLog.findMany({
        where: { testSessionId: input.sessionId },
        orderBy: { createdAt: "asc" },
        take: input.limit,
        skip: input.offset,
      });
    }),

  // Debug endpoint to check raw data
  debugGetAll: protectedUserProcedure
    .input(z.object({ projectId: z.string() }))
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

      // Verify user has access to project through ProjectMember
      const projectMember = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          accountId: account.id
        }
      });

      if (!projectMember) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "プロジェクトが見つかりません" 
        });
      }

      const sessions = await ctx.db.testSession.findMany({
        where: { projectId: input.projectId },
        take: 10,
        orderBy: { createdAt: "desc" }
      });
      
      return {
        count: sessions.length,
        sessions,
        projectId: input.projectId
      };
    }),

  // Get test session statistics
  getStats: protectedUserProcedure
    .input(z.object({ projectId: z.string() }))
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

      // Verify user has access to project through ProjectMember
      const projectMember = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          accountId: account.id
        }
      });

      if (!projectMember) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "プロジェクトが見つかりません" 
        });
      }

      // Last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stats = await ctx.db.testSession.groupBy({
        by: ["status"],
        where: {
          projectId: input.projectId,
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: true
      });

      const bugStats = await ctx.db.bugTicket.groupBy({
        by: ["severity"],
        where: {
          projectId: input.projectId,
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: true
      });

      const avgDuration = await ctx.db.testSession.aggregate({
        where: {
          projectId: input.projectId,
          status: "completed",
          duration: { not: null }
        },
        _avg: { duration: true }
      });

      return {
        sessionsByStatus: stats.reduce((acc, item) => ({
          ...acc,
          [item.status]: item._count
        }), {}),
        bugsBySeverity: bugStats.reduce((acc, item) => ({
          ...acc,
          [item.severity]: item._count
        }), {}),
        averageDuration: avgDuration._avg.duration || 0
      };
    }),
});

export type TestSessionRouter = typeof testSessionRouter;