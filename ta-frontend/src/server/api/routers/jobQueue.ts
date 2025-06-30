import { z } from "zod";
import { createTRPCRouter, protectedUserProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const jobQueueRouter = createTRPCRouter({
  // Get job queue status for test session
  getByTestSession: protectedUserProcedure
    .input(z.object({ 
      testSessionId: z.string() 
    }))
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

      // Verify test session belongs to organization
      const testSession = await ctx.db.testSession.findFirst({
        where: {
          id: input.testSessionId,
          project: {
            organizationId: account.organizationId
          }
        }
      });

      if (!testSession) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "テストセッションが見つかりません" 
        });
      }

      const jobs = await ctx.db.jobQueue.findMany({
        where: { testSessionId: input.testSessionId },
        orderBy: { createdAt: "desc" }
      });

      return jobs;
    }),

  // Get all pending jobs (admin only)
  getPending: protectedUserProcedure
    .input(z.object({ 
      limit: z.number().min(1).max(100).default(10) 
    }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { role: true, organizationId: true }
      });

      if (!account || account.role !== "admin") {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "管理者権限が必要です" 
        });
      }

      return ctx.db.jobQueue.findMany({
        where: { 
          status: "pending",
          testSession: {
            project: {
              organizationId: account.organizationId
            }
          }
        },
        include: {
          testSession: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: [
          { priority: "asc" },
          { scheduledAt: "asc" }
        ],
        take: input.limit
      });
    }),

  // Get job statistics
  getStats: protectedUserProcedure
    .query(async ({ ctx }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { organizationId: true }
      });

      if (!account) {
        throw new TRPCError({ 
          code: "UNAUTHORIZED",
          message: "アカウントが見つかりません" 
        });
      }

      const stats = await ctx.db.jobQueue.groupBy({
        by: ["status", "type"],
        where: {
          testSession: {
            project: {
              organizationId: account.organizationId
            }
          }
        },
        _count: true
      });

      return stats.reduce((acc, item) => {
        if (!acc[item.type]) {
          acc[item.type] = {};
        }
        acc[item.type][item.status] = item._count;
        return acc;
      }, {} as Record<string, Record<string, number>>);
    })
});

export type JobQueueRouter = typeof jobQueueRouter;