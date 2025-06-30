import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { 
  createTRPCRouter, 
  protectedUserProcedure,
} from "../trpc";

export const testConfigRouter = createTRPCRouter({
  // Get single test config
  get: protectedUserProcedure
    .input(z.object({ id: z.string() }))
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

      const testConfig = await ctx.db.testConfig.findFirst({ 
        where: { 
          id: input.id,
          project: {
            organizationId: account.organizationId
          }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: { testSessions: true }
          }
        }
      });

      if (!testConfig) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "テスト設定が見つかりません" 
        });
      }

      return testConfig;
    }),

  // Get all test configs for a project
  getAllByProject: protectedUserProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
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
      
      return ctx.db.testConfig.findMany({
        where: { projectId: input.projectId },
        include: {
          _count: {
            select: { testSessions: true }
          }
        },
        orderBy: [
          { isDefault: "desc" },
          { createdAt: "desc" }
        ],
      });
    }),

  // Create test config
  create: protectedUserProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(100),
        mode: z.enum(["omakase", "scenario", "hybrid"]),
        browser: z.enum(["chrome", "firefox", "safari"]),
        viewportWidth: z.number().min(320).max(3840),
        viewportHeight: z.number().min(240).max(2160),
        maxDuration: z.number().min(60).max(7200), // 1 minute to 2 hours
        authType: z.enum(["basic", "oauth", "custom"]).optional(),
        authConfig: z.object({
          username: z.string().optional(),
          password: z.string().optional(),
          loginUrl: z.string().url().optional(),
          customScript: z.string().optional(),
        }).optional(),
        excludedPaths: z.array(z.string()),
        customRules: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            selector: z.string().optional(),
            action: z.enum(["click", "ignore", "wait"]),
            value: z.string().optional(),
          })
        ).optional(),
        setAsDefault: z.boolean().default(false),
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

      // Check project membership
      const member = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          accountId: account.id,
          role: { in: ["owner", "admin"] }
        }
      });

      if (!member) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "テスト設定を作成する権限がありません" 
        });
      }

      const { setAsDefault, ...configData } = input;

      // Handle default config
      const result = await ctx.db.$transaction(async (tx) => {
        if (setAsDefault) {
          // Unset current default
          await tx.testConfig.updateMany({
            where: {
              projectId: input.projectId,
              isDefault: true
            },
            data: { isDefault: false }
          });
        }

        // Create new config
        return tx.testConfig.create({
          data: {
            ...configData,
            isDefault: setAsDefault,
            customRules: configData.customRules || []
          },
        });
      });

      return result;
    }),

  // Update test config
  update: protectedUserProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100),
        mode: z.enum(["omakase", "scenario", "hybrid"]),
        browser: z.enum(["chrome", "firefox", "safari"]),
        viewportWidth: z.number().min(320).max(3840),
        viewportHeight: z.number().min(240).max(2160),
        maxDuration: z.number().min(60).max(7200),
        authType: z.enum(["basic", "oauth", "custom"]).nullable(),
        authConfig: z.object({
          username: z.string().optional(),
          password: z.string().optional(),
          loginUrl: z.string().url().optional(),
          customScript: z.string().optional(),
        }).nullable(),
        excludedPaths: z.array(z.string()),
        customRules: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            selector: z.string().optional(),
            action: z.enum(["click", "ignore", "wait"]),
            value: z.string().optional(),
          })
        ).nullable(),
        setAsDefault: z.boolean().default(false),
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

      const testConfig = await ctx.db.testConfig.findUnique({
        where: { id: input.id },
        select: { projectId: true }
      });

      if (!testConfig) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "テスト設定が見つかりません" 
        });
      }

      // Check project membership
      const member = await ctx.db.projectMember.findFirst({
        where: {
          projectId: testConfig.projectId,
          accountId: account.id,
          role: { in: ["owner", "admin"] }
        }
      });

      if (!member) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "テスト設定を更新する権限がありません" 
        });
      }

      const { id, setAsDefault, ...data } = input;

      // Handle default config
      const result = await ctx.db.$transaction(async (tx) => {
        if (setAsDefault) {
          // Unset current default
          await tx.testConfig.updateMany({
            where: {
              projectId: testConfig.projectId,
              isDefault: true,
              id: { not: id }
            },
            data: { isDefault: false }
          });
        }

        // Update config
        const updateData: any = {
          ...data,
          isDefault: setAsDefault,
          customRules: data.customRules || []
        };
        
        if (data.authConfig === null) {
          updateData.authConfig = null;
        } else if (data.authConfig) {
          updateData.authConfig = data.authConfig;
        }
        
        return tx.testConfig.update({
          where: { id },
          data: updateData,
        });
      });

      return result;
    }),

  // Delete test config
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

      const testConfig = await ctx.db.testConfig.findUnique({
        where: { id: input.id },
        select: { 
          projectId: true,
          isDefault: true,
          _count: {
            select: { testSessions: true }
          }
        }
      });

      if (!testConfig) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "テスト設定が見つかりません" 
        });
      }

      // Check project membership
      const member = await ctx.db.projectMember.findFirst({
        where: {
          projectId: testConfig.projectId,
          accountId: account.id,
          role: { in: ["owner", "admin"] }
        }
      });

      if (!member) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "テスト設定を削除する権限がありません" 
        });
      }

      if (testConfig.isDefault) {
        throw new TRPCError({ 
          code: "PRECONDITION_FAILED",
          message: "デフォルトのテスト設定は削除できません" 
        });
      }

      if (testConfig._count.testSessions > 0) {
        throw new TRPCError({ 
          code: "PRECONDITION_FAILED",
          message: "使用中のテスト設定は削除できません" 
        });
      }

      return ctx.db.testConfig.delete({
        where: { id: input.id },
      });
    }),

  // Duplicate test config
  duplicate: protectedUserProcedure
    .input(
      z.object({ 
        id: z.string(),
        name: z.string().min(1).max(100)
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

      const sourceConfig = await ctx.db.testConfig.findUnique({
        where: { id: input.id }
      });

      if (!sourceConfig) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "テスト設定が見つかりません" 
        });
      }

      // Check project membership
      const member = await ctx.db.projectMember.findFirst({
        where: {
          projectId: sourceConfig.projectId,
          accountId: account.id,
          role: { in: ["owner", "admin"] }
        }
      });

      if (!member) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "テスト設定を複製する権限がありません" 
        });
      }

      // Create duplicate
      const { id, createdAt, updatedAt, isDefault, ...configData } = sourceConfig;
      
      const createData: any = {
        ...configData,
        name: input.name,
        isDefault: false
      };
      
      if (configData.authConfig === null) {
        createData.authConfig = null;
      }
      
      if (configData.customRules === null) {
        createData.customRules = null;
      }
      
      return ctx.db.testConfig.create({
        data: createData,
      });
    }),
});

export type TestConfigRouter = typeof testConfigRouter;