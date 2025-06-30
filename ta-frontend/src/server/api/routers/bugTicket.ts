import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { 
  createTRPCRouter, 
  protectedUserProcedure,
} from "../trpc";

type BugStatus = "open" | "in_progress" | "resolved" | "closed" | "false_positive";
type BugSeverity = "critical" | "high" | "medium" | "low";
type BugType = "ui" | "functional" | "performance" | "security";

type StatusCounts = Partial<Record<BugStatus, number>>;
type SeverityCounts = Partial<Record<BugSeverity, number>>;
type TypeCounts = Partial<Record<BugType, number>>;

export const bugTicketRouter = createTRPCRouter({
  // Get single bug ticket
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

      const bugTicket = await ctx.db.bugTicket.findFirst({ 
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
          project: {
            select: {
              id: true,
              name: true
            }
          },
          testSession: {
            select: {
              id: true,
              createdAt: true,
              testConfig: {
                select: {
                  name: true,
                  browser: true
                }
              }
            }
          },
          testResult: true,
          reportedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          comments: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: "asc" }
          }
        }
      });

      if (!bugTicket) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "バグチケットが見つかりません" 
        });
      }

      return bugTicket;
    }),

  // Get all bug tickets with filters
  getAll: protectedUserProcedure
    .input(
      z.object({ 
        projectId: z.string().optional(),
        status: z.array(z.enum(["open", "in_progress", "resolved", "closed", "false_positive"])).optional(),
        severity: z.array(z.enum(["critical", "high", "medium", "low"])).optional(),
        bugType: z.array(z.enum(["ui", "functional", "performance", "security"])).optional(),
        searchQuery: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        sortBy: z.enum(["createdAt", "severity", "status"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
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
      
      const where = {
        project: {
          members: {
            some: {
              accountId: account.id
            }
          },
          ...(input.projectId && { id: input.projectId })
        },
        ...(input.status && { status: { in: input.status } }),
        ...(input.severity && { severity: { in: input.severity } }),
        ...(input.bugType && { bugType: { in: input.bugType } }),
        ...(input.searchQuery && {
          OR: [
            { title: { contains: input.searchQuery, mode: "insensitive" as const } },
            { description: { contains: input.searchQuery, mode: "insensitive" as const } },
          ]
        })
      };

      const orderBy = (() => {
        switch (input.sortBy) {
          case "severity":
            return [
              { severity: input.sortOrder },
              { createdAt: "desc" as const }
            ];
          case "status":
            return [
              { status: input.sortOrder },
              { createdAt: "desc" as const }
            ];
          default:
            return { createdAt: input.sortOrder };
        }
      })();

      const result = await ctx.db.$transaction(async (tx) => {
        const tickets = await tx.bugTicket.findMany({
          where,
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            },
            testSession: {
              select: {
                id: true,
                createdAt: true
              }
            },
            reportedBy: {
              select: {
                name: true,
                email: true
              }
            },
            _count: {
              select: { comments: true }
            }
          },
          orderBy,
          take: input.limit,
          skip: input.offset,
        });
        const total = await tx.bugTicket.count({ where });
        return { tickets, total };
      });

      return {
        tickets: result.tickets,
        total: result.total,
        hasMore: result.total > input.offset + input.limit
      };
    }),

  // Update bug ticket status
  updateStatus: protectedUserProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["open", "in_progress", "resolved", "closed", "false_positive"]),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true }
      });

      if (!account) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const bugTicket = await ctx.db.bugTicket.findUnique({
        where: { id: input.id },
        select: {
          projectId: true,
          status: true
        }
      });

      if (!bugTicket) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "バグチケットが見つかりません" 
        });
      }

      // Check project membership
      const member = await ctx.db.projectMember.findFirst({
        where: {
          projectId: bugTicket.projectId,
          accountId: account.id
        }
      });

      if (!member) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "バグチケットを更新する権限がありません" 
        });
      }

      // Update bug ticket and add comment if provided
      const result = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.bugTicket.update({
          where: { id: input.id },
          data: { 
            status: input.status,
            ...(input.status === "resolved" && { resolvedAt: new Date() })
          },
        });

        if (input.comment) {
          await tx.bugComment.create({
            data: {
              bugTicketId: input.id,
              accountId: account.id,
              comment: `ステータスを「${bugTicket.status}」から「${input.status}」に変更しました。\n${input.comment}`
            }
          });
        }

        // Log activity
        await tx.activityLog.create({
          data: {
            accountId: account.id,
            action: "bug_status_updated",
            resourceType: "bug_ticket",
            resourceId: input.id,
            metadata: {
              oldStatus: bugTicket.status,
              newStatus: input.status
            }
          }
        });

        return updated;
      });

      return result;
    }),

  // Update bug ticket details
  update: protectedUserProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["open", "in_progress", "resolved", "closed", "false_positive"]).optional(),
        severity: z.enum(["critical", "high", "medium", "low"]).optional(),
        bugType: z.enum(["ui", "functional", "performance", "security"]).optional(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        affectedComponents: z.array(z.string()).optional(),
        suggestedFix: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true }
      });

      if (!account) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const bugTicket = await ctx.db.bugTicket.findUnique({
        where: { id: input.id },
        select: { projectId: true }
      });

      if (!bugTicket) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "バグチケットが見つかりません" 
        });
      }

      // Check project membership
      const member = await ctx.db.projectMember.findFirst({
        where: {
          projectId: bugTicket.projectId,
          accountId: account.id
        }
      });

      if (!member) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "バグチケットを更新する権限がありません" 
        });
      }

      const { id, ...data } = input;
      return ctx.db.bugTicket.update({
        where: { id },
        data,
      });
    }),

  // Get comments for a bug ticket
  getComments: protectedUserProcedure
    .input(
      z.object({
        bugId: z.string(),
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

      // Verify bug ticket exists and user has access through project membership
      const bugTicket = await ctx.db.bugTicket.findFirst({
        where: {
          id: input.bugId,
          project: {
            members: {
              some: {
                accountId: account.id
              }
            }
          }
        }
      });

      if (!bugTicket) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "バグチケットが見つかりません" 
        });
      }

      const comments = await ctx.db.bugComment.findMany({
        where: { bugTicketId: input.bugId },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "asc" }
      });

      return {
        comments: comments.map(comment => ({
          id: comment.id,
          content: comment.comment,
          authorName: comment.account.name,
          authorEmail: comment.account.email,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt
        }))
      };
    }),

  // Add comment to bug ticket
  addComment: protectedUserProcedure
    .input(
      z.object({
        bugId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true }
      });

      if (!account) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const bugTicket = await ctx.db.bugTicket.findUnique({
        where: { id: input.bugId },
        select: { projectId: true }
      });

      if (!bugTicket) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "バグチケットが見つかりません" 
        });
      }

      // Check project membership
      const member = await ctx.db.projectMember.findFirst({
        where: {
          projectId: bugTicket.projectId,
          accountId: account.id
        }
      });

      if (!member) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "コメントを追加する権限がありません" 
        });
      }

      return ctx.db.bugComment.create({
        data: {
          bugTicketId: input.bugId,
          accountId: account.id,
          comment: input.content
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    }),

  // Get bug statistics for dashboard
  getStats: protectedUserProcedure
    .input(
      z.object({ 
        projectId: z.string().optional(),
        dateRange: z.enum(["7days", "30days", "90days"]).default("30days")
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

      const daysMap = { "7days": 7, "30days": 30, "90days": 90 };
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysMap[input.dateRange]);

      const where = {
        project: {
          members: {
            some: {
              accountId: account.id
            }
          },
          ...(input.projectId && { id: input.projectId })
        },
        createdAt: { gte: startDate }
      };

      const result = await ctx.db.$transaction(async (tx) => {
        // By status
        const byStatus = await tx.bugTicket.groupBy({
          by: ["status"],
          where,
          _count: true
        });
        // By severity
        const bySeverity = await tx.bugTicket.groupBy({
          by: ["severity"],
          where,
          _count: true
        });
        // By type
        const byType = await tx.bugTicket.groupBy({
          by: ["bugType"],
          where,
          _count: true
        });
        // Daily trend
        const trend = await tx.$queryRaw`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as count,
            COUNT(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 END) as resolved_count
          FROM "BugTicket"
          WHERE created_at >= ${startDate}
            ${input.projectId ? Prisma.sql`AND project_id = ${input.projectId}` : Prisma.empty}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `;
        
        return { byStatus, bySeverity, byType, trend };
      });

      return {
        byStatus: result.byStatus.reduce<StatusCounts>((acc, item) => ({
          ...acc,
          [item.status]: item._count
        }), {}),
        bySeverity: result.bySeverity.reduce<SeverityCounts>((acc, item) => ({
          ...acc,
          [item.severity]: item._count
        }), {}),
        byType: result.byType.reduce<TypeCounts>((acc, item) => ({
          ...acc,
          [item.bugType]: item._count
        }), {}),
        trend: result.trend as Array<{ date: Date; count: number; resolved_count: number }>
      };
    }),
});

export type BugTicketRouter = typeof bugTicketRouter;