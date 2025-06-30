import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { 
  createTRPCRouter, 
  protectedUserProcedure,
  protectedAdminProcedure 
} from "../trpc";

export const organizationRouter = createTRPCRouter({
  // Get current user's organization
  getCurrent: protectedUserProcedure.query(async ({ ctx }) => {
    const account = await ctx.db.account.findUnique({
      where: { email: ctx.session.user.email },
      include: { 
        organization: {
          include: {
            _count: {
              select: { 
                projects: true,
                accounts: true
              }
            },
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
        }
      },
    });

    if (!account?.organization) {
      throw new TRPCError({ 
        code: "NOT_FOUND",
        message: "組織が見つかりません" 
      });
    }

    // Calculate total test sessions across all projects
    const totalTestSessions = account.organization.projects.reduce(
      (sum, project) => sum + project._count.testSessions,
      0
    );

    // Return organization with calculated testSessions count
    const { projects, ...organizationData } = account.organization;
    return {
      ...organizationData,
      _count: {
        ...organizationData._count,
        testSessions: totalTestSessions
      }
    };
  }),

  // Get organization by ID (admin only)
  get: protectedAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const organization = await ctx.db.organization.findUnique({ 
        where: { id: input.id },
        include: {
          accounts: true,
          projects: true,
          integrations: true,
          usageStats: {
            orderBy: { month: "desc" },
            take: 12
          }
        }
      });

      if (!organization) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "組織が見つかりません" 
        });
      }

      return organization;
    }),

  // Get all organizations (admin only)
  getAll: protectedAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.organization.findMany({
      include: {
        _count: {
          select: { 
            projects: true,
            accounts: true 
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Create organization (admin only)
  create: protectedAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        plan: z.enum(["free", "professional", "enterprise"]).default("free"),
        monthlyTestLimit: z.number().min(0).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate unique API key
      const apiKey = `qa3_${crypto.randomUUID()}`;

      return ctx.db.organization.create({
        data: {
          ...input,
          apiKey,
          trialEndsAt: input.plan === "free" 
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
            : null,
        },
      });
    }),

  // Update organization
  update: protectedAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100),
        plan: z.enum(["free", "professional", "enterprise"]),
        monthlyTestLimit: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.organization.update({
        where: { id },
        data,
      });
    }),

  // Get organization usage stats
  getUsageStats: protectedUserProcedure.query(async ({ ctx }) => {
    const account = await ctx.db.account.findUnique({
      where: { email: ctx.session.user.email },
      select: { organizationId: true }
    });

    if (!account?.organizationId) {
      throw new TRPCError({ 
        code: "NOT_FOUND",
        message: "組織が見つかりません" 
      });
    }

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const stats = await ctx.db.usageStats.findUnique({
      where: {
        organizationId_month: {
          organizationId: account.organizationId,
          month: currentMonth
        }
      }
    });

    const organization = await ctx.db.organization.findUnique({
      where: { id: account.organizationId },
      select: { monthlyTestLimit: true, plan: true }
    });

    return {
      currentUsage: stats || {
        testSessionCount: 0,
        bugReportCount: 0,
        totalTestMinutes: 0
      },
      limit: organization?.monthlyTestLimit || 0,
      plan: organization?.plan || "free"
    };
  }),

  // Regenerate API key
  regenerateApiKey: protectedAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const newApiKey = `qa3_${crypto.randomUUID()}`;
      
      return ctx.db.organization.update({
        where: { id: input.id },
        data: { apiKey: newApiKey },
        select: { apiKey: true }
      });
    }),
});

export type OrganizationRouter = typeof organizationRouter;