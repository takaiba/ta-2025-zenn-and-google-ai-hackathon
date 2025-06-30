import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth0 } from "@/lib/auth0";

import { bypassedExtension, db, tenantGuardedExtension } from "../db/prisma";

/**
 * 1. コンテキスト
 *
 * このセクションでは、バックエンドAPIで利用可能な「コンテキスト」を定義します。
 * リクエストを処理する際に、データベース、セッションなどにアクセスすることができます。
 * このヘルパーは、tRPCコンテキストの「内部」を生成します。APIハンドラーとRSCクライアントは
 * それぞれこれをラップし、必要なコンテキストを提供します。
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth0.getSession();

  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. 初期化
 *
 * ここでtRPC APIを初期化し、コンテキストとトランスフォーマーを接続します。
 * また、バックエンドでバリデーションエラーが発生した場合にフロントエンドで型安全性が
 * 得られるように、ZodErrorsをパースします。
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * サーバーサイドのコーラーを作成します。
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ルーターとプロシージャ（重要な部分）
 *
 * これらはtRPC APIを構築するために使用するコンポーネントです。
 * "/src/server/api/routers"ディレクトリで頻繁にインポートすることになります。
 */

/**
 * tRPC APIで新しいルーターとサブルーターを作成する方法です。
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

const publicMiddleware = t.middleware(async ({ next }) => {
  return next({
    ctx: {
      db: db.$extends(bypassedExtension()),
    },
  });
});
/** 未ログインの場合でもAPIアクセスを許可する */
export const publicProcedure = t.procedure.use(publicMiddleware);

const authenticatedUserMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const bypassedDb = ctx.db.$extends(bypassedExtension());
  const account = await bypassedDb.account.findUnique({
    where: {
      email: ctx.session.user.email as string,
    },
  });
  if (!account) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const rlsDb = ctx.db.$extends(tenantGuardedExtension(account.organizationId));

  return next({
    ctx: {
      db: rlsDb,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});
/** ログイン状態の場合にAPIアクセスを許可する。ユーザーロールについては制限しない */
export const protectedUserProcedure = t.procedure.use(
  authenticatedUserMiddleware,
);

const authenticatedTenantAdminMiddleware = t.middleware(
  async ({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const bypassedDb = ctx.db.$extends(bypassedExtension());
    const account = await bypassedDb.account.findUnique({
      where: {
        email: ctx.session.user.email as string,
      },
    });
    if (!account) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (account.role !== "admin" && account.role !== "tenantAdmin") {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const rlsDb = ctx.db.$extends(tenantGuardedExtension(account.organizationId));

    return next({
      ctx: {
        db: rlsDb,
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  },
);
/** ログイン状態かつ管理者またはテナント管理者の場合にAPIアクセスを許可する */
export const protectedTenantAdminProcedure = t.procedure.use(
  authenticatedTenantAdminMiddleware,
);

const authenticatedAdminMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const bypassedDb = ctx.db.$extends(bypassedExtension());
  const account = await bypassedDb.account.findUnique({
    where: {
      email: ctx.session.user.email as string,
    },
  });
  if (!account) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (account.role !== "admin") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      db: db.$extends(bypassedExtension()),
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});
/** ログイン状態かつ管理者の場合にAPIアクセスを許可する */
export const protectedAdminProcedure = t.procedure.use(
  authenticatedAdminMiddleware,
);

// 認証済みだがアカウント未登録でも使用可能なプロシージャ（デモ登録専用）
const authenticatedOnlyMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Auth0で認証されているかのみチェック（アカウント登録は不要）
  const bypassedDb = ctx.db.$extends(bypassedExtension());

  return next({
    ctx: {
      db: bypassedDb,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const authenticatedProcedure = t.procedure.use(authenticatedOnlyMiddleware);
