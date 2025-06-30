import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { 
  createTRPCRouter, 
  protectedUserProcedure,
} from "../trpc";

export const projectRouter = createTRPCRouter({
  // Get single project
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

      // Check if user has access to the project through ProjectMember
      const projectMember = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.id,
          accountId: account.id
        }
      });

      if (!projectMember) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "プロジェクトが見つかりません" 
        });
      }

      const project = await ctx.db.project.findFirst({ 
        where: { 
          id: input.id,
          isActive: true
        },
        include: {
          organization: true,
          testConfigs: true,
          _count: {
            select: { 
              testSessions: true,
              bugTickets: true,
              testScenarios: true
            }
          }
        }
      });

      if (!project) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "プロジェクトが見つかりません" 
        });
      }

      return project;
    }),

  // Get all projects for current account
  getAll: protectedUserProcedure.query(async ({ ctx }) => {
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
    
    // Get all project IDs that the user has access to through ProjectMember
    const projectMembers = await ctx.db.projectMember.findMany({
      where: { accountId: account.id },
      select: { projectId: true }
    });

    const projectIds = projectMembers.map(pm => pm.projectId);

    return ctx.db.project.findMany({
      where: { 
        id: { in: projectIds },
        isActive: true 
      },
      include: {
        _count: {
          select: { 
            testSessions: true,
            bugTickets: {
              where: { status: { in: ["open", "in_progress"] } }
            }
          }
        },
        testSessions: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Create project
  create: protectedUserProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        url: z.string().url(),
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

      // Create project with default test config
      const project = await ctx.db.$transaction(async (tx) => {
        // Create project
        const newProject = await tx.project.create({
          data: {
            ...input,
            organizationId: account.organizationId,
          },
        });

        // Add current user as project owner
        await tx.projectMember.create({
          data: {
            projectId: newProject.id,
            accountId: account.id,
            role: "owner"
          }
        });

        // Create default test config
        await tx.testConfig.create({
          data: {
            projectId: newProject.id,
            name: "デフォルト設定",
            mode: "omakase",
            browser: "chrome",
            viewportWidth: 1920,
            viewportHeight: 1080,
            maxDuration: 3600,
            excludedPaths: [],
            isDefault: true
          }
        });

        return newProject;
      });

      return project;
    }),

  // Update project
  update: protectedUserProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        url: z.string().url(),
        isActive: z.boolean().optional(),
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

      // Check if user has permission to update project
      const member = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.id,
          accountId: account.id,
          role: { in: ["owner", "admin"] }
        }
      });

      if (!member) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "プロジェクトを更新する権限がありません" 
        });
      }

      const { id, ...data } = input;
      return ctx.db.project.update({
        where: { id },
        data,
      });
    }),

  // Delete project (soft delete by setting isActive to false)
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

      // Check if user is project owner
      const member = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.id,
          accountId: account.id,
          role: "owner"
        }
      });

      if (!member) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "プロジェクトを削除する権限がありません" 
        });
      }

      // Check for active test sessions
      const activeSessionCount = await ctx.db.testSession.count({
        where: { 
          projectId: input.id,
          status: { in: ["pending", "running"] }
        }
      });
      
      if (activeSessionCount > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "実行中のテストセッションが存在します",
        });
      }

      // Soft delete
      return ctx.db.project.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // Get project members
  getMembers: protectedUserProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.projectMember.findMany({
        where: { projectId: input.projectId },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: "asc" }
      });
    }),

  // Add project member
  addMember: protectedUserProcedure
    .input(
      z.object({
        projectId: z.string(),
        email: z.string().email(),
        role: z.enum(["admin", "member"])
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentAccount = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true, organizationId: true }
      });

      if (!currentAccount) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Check if current user has permission
      const currentMember = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          accountId: currentAccount.id,
          role: { in: ["owner", "admin"] }
        }
      });

      if (!currentMember) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "メンバーを追加する権限がありません" 
        });
      }

      // Find account to add
      const accountToAdd = await ctx.db.account.findFirst({
        where: { 
          email: input.email
        }
      });

      if (!accountToAdd) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "指定されたメールアドレスのアカウントが見つかりません" 
        });
      }

      // Check if already member
      const existingMember = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          accountId: accountToAdd.id
        }
      });

      if (existingMember) {
        throw new TRPCError({ 
          code: "CONFLICT",
          message: "既にプロジェクトメンバーです" 
        });
      }

      return ctx.db.projectMember.create({
        data: {
          projectId: input.projectId,
          accountId: accountToAdd.id,
          role: input.role
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });
    }),

  // Remove project member
  removeMember: protectedUserProcedure
    .input(
      z.object({
        projectId: z.string(),
        memberId: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentAccount = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true }
      });

      if (!currentAccount) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Check if current user has permission
      const currentMember = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          accountId: currentAccount.id,
          role: { in: ["owner", "admin"] }
        }
      });

      if (!currentMember) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "メンバーを削除する権限がありません" 
        });
      }

      // Prevent removing the last owner
      const ownerCount = await ctx.db.projectMember.count({
        where: {
          projectId: input.projectId,
          role: "owner"
        }
      });

      const memberToRemove = await ctx.db.projectMember.findUnique({
        where: { id: input.memberId }
      });

      if (ownerCount === 1 && memberToRemove?.role === "owner") {
        throw new TRPCError({ 
          code: "PRECONDITION_FAILED",
          message: "最後のオーナーは削除できません" 
        });
      }

      return ctx.db.projectMember.delete({
        where: { id: input.memberId }
      });
    }),
});

export type ProjectRouter = typeof projectRouter;