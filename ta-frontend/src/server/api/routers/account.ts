import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedAdminProcedure, authenticatedProcedure } from "../trpc";

/** 全アカウントを管理するルーティング。管理者専用 */
export const accountRouter = createTRPCRouter({
  get: protectedAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.account.findUnique({
        where: { id: input.id },
        include: { organization: true },
      });
    }),
  getCurrent: protectedAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.account.findUnique({
      where: { email: ctx.session.user.email },
      include: { organization: true },
    });
  }),
  // 全テナントの全アカウントを取得
  getAll: protectedAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.account.findMany({
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });
  }),
  create: protectedAdminProcedure
    .input(
      z.object({
        email: z.string(),
        name: z.string(),
        role: z.string(),
        organizationId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Userテーブルに同じメールアドレスのレコードが存在すれば、そのuserIdをAccountレコードにセットする（アプリケーション側で認証されている事を紐づける）
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      await ctx.db.$transaction(async (tx) => {
        await tx.account.create({
          data: {
            userId: user ? user.id : null,
            email: input.email,
            name: input.name,
            role: input.role,
            organizationId: input.organizationId,
          },
        });
      });
    }),
  update: protectedAdminProcedure
    .input(
      z.object({
        accountId: z.string(),
        email: z.string(),
        name: z.string(),
        role: z.string(),
        organizationId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.account.update({
        where: { id: input.accountId },
        data: {
          email: input.email,
          name: input.name,
          role: input.role,
          organizationId: input.organizationId,
        },
      });
    }),
  delete: protectedAdminProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.account.delete({ where: { id: input.accountId } });
    }),

  // デモ用アカウント登録（プロトタイプ専用）
  registerDemo: authenticatedProcedure
    .mutation(async ({ ctx }) => {
      const userEmail = ctx.session.user.email;

      if (!userEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ユーザーのメールアドレスが取得できませんでした"
        });
      }

      // 既にアカウントが存在するかチェック
      const existingAccount = await ctx.db.account.findUnique({
        where: { email: userEmail },
      });

      if (existingAccount) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "アカウントは既に登録されています"
        });
      }

      // デモ組織を作成または取得
      let demoOrg = await ctx.db.organization.findFirst({
        where: { name: "デモ組織" },
      });

      if (!demoOrg) {
        // デモ用のAPIキーを生成
        const demoApiKey = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

        demoOrg = await ctx.db.organization.create({
          data: {
            name: "デモ組織",
            apiKey: demoApiKey,
          },
        });
      }

      // Userテーブルから関連するユーザーを取得
      const user = await ctx.db.user.findUnique({
        where: { email: userEmail },
      });

      // アカウントを管理者権限で作成
      const account = await ctx.db.account.create({
        data: {
          userId: user ? user.id : null,
          email: userEmail,
          name: ctx.session.user.name || "デモユーザー",
          role: "admin", // 管理者権限で登録
          organizationId: demoOrg.id,
        },
        include: {
          organization: true,
        },
      });

      return account;
    }),
});

export type AccountRouter = typeof accountRouter;
