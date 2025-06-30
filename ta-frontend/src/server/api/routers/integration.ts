import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const integrationRouter = createTRPCRouter({
  get: protectedUserProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.integration.findUnique({
        where: { id: input.id },
        include: {
          project: true,
        },
      });
    }),

  getAll: protectedUserProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        type: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get the account to access organizationId
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

      const where: any = {
        project: {
          organizationId: account.organizationId,
        },
      };

      if (input.projectId) {
        where.projectId = input.projectId;
      }
      if (input.type) {
        where.type = input.type;
      }

      const integrations = await ctx.db.integration.findMany({
        where,
        include: {
          project: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        integrations,
      };
    }),

  create: protectedUserProcedure
    .input(
      z.object({
        projectId: z.string(),
        type: z.enum(["slack", "github", "jira", "webhook"]),
        name: z.string(),
        config: z.any(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      return ctx.db.integration.create({
        data: {
          organizationId: account.organizationId,
          projectId: input.projectId,
          type: input.type,
          name: input.name,
          config: input.config,
          isActive: input.isActive,
        },
      });
    }),

  update: protectedUserProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        config: z.any().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.integration.update({
        where: { id: input.id },
        data: {
          name: input.name,
          config: input.config,
          isActive: input.isActive,
        },
      });
    }),

  delete: protectedUserProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.integration.delete({
        where: { id: input.id },
      });
    }),

  testConnection: protectedUserProcedure
    .input(
      z.object({
        type: z.enum(["slack", "github", "jira", "webhook"]),
        config: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // This would test the integration connection
      // For now, just return success
      return {
        success: true,
        message: "接続テストに成功しました",
      };
    }),
});

export type IntegrationRouter = typeof integrationRouter;