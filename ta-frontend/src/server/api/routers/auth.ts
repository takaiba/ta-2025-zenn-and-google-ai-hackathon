import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

/** 認証に使用するためpublicProcedureにしている */
export const authRouter = createTRPCRouter({
  isAdminAuth: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user.email) return false;
    const email = ctx.session.user.email;
    // 管理者はこの権限を持つ
    const account = await ctx.db.account.findFirst({
      where: {
        email: email,
        role: "admin",
      },
    });
    return !!account;
  }),
  isTenantAdminAuth: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user.email) return false;
    const email = ctx.session.user.email;
    // テナント管理者、管理者はこの権限を持つ
    const account = await ctx.db.account.findFirst({
      where: {
        email: email,
        role: {
          in: ["tenantAdmin", "admin"],
        },
      },
    });
    return !!account;
  }),
  isUserAuth: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user.email) return false;
    const email = ctx.session.user.email;
    // ユーザー、テナント管理者、管理者はこの権限を持つ
    const account = await ctx.db.account.findFirst({
      where: {
        email: email,
        role: {
          in: ["user", "tenantAdmin", "admin"],
        },
      },
    });
    return !!account;
  }),
  /**
   * Auth0のセッション情報が、アプリケーション的に承認されたユーザーかどうかを確認する
   *
   * Accountテーブルにデータがある承認されたユーザーかどうかを確認し、ある場合は各テーブルのデータを更新する
   */
  checkRegistration: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: input.email },
      });
      if (!account) return;

      // Auth0のユーザーテーブルにセッション情報を保存する
      await ctx.db.user.upsert({
        where: { id: input.userId },
        update: {
          email: input.email,
          name: input.name,
        },
        create: {
          id: input.userId,
          email: input.email,
          name: input.name,
        },
      });
      // サービス側のユーザーテーブルにAuth0のユーザー情報を紐づける
      await ctx.db.account.update({
        where: { id: account.id },
        data: { userId: input.userId },
      });
    }),
  // アプリケーション的に許可されたユーザーかどうかを確認する
  checkAllowedUser: publicProcedure
    .input(z.object({ userId: z.string(), email: z.string() }))
    .query(async ({ input, ctx }) => {
      const account = await ctx.db.account.findUnique({
        where: { userId: input.userId, email: input.email },
      });
      return !!account;
    }),
});

export type AuthRouter = typeof authRouter;
