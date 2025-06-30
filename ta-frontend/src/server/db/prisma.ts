// anyが多すぎるので無効にしている
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Prisma, PrismaClient } from "@prisma/client";

/** RLSの有効/無効を制御するPrismaClientExtension */
const prismaExtension = (tenantId: string | null) => {
  return Prisma.defineExtension((prisma) =>
    prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({
            args,
            query,
            model,
            operation,
            ...rest
          }: {
            args: any;
            query: any;
            model: any;
            operation: any;
          }) {
            // MEMO: $transactionを拡張した状態で、トランザクションを実行すると、トランザクションが正常に動作しないバグがある
            // 例：トランザクション中にエラーが発生してもロールバックせず、クエリが最後まで実行されてしまう
            // そのため、トランザクションの場合は、$transactionを拡張した状態ではなく、Clientを直接拡張した状態で実行する
            // また、動作安定性のため、Sequential operationsではなく、Interactive transactionを使わせる
            // https://github.com/prisma/prisma/issues/20678

            const transaction = (rest as any).__internalParams.transaction;

            // トランザクションの場合
            if (transaction) {
              if (transaction.kind === "itx") {
                // Interactive transaction（関数型）の場合
                console.log("Interactive transaction");
                const transactionClient = (prisma as any)._createItxClient(
                  transaction,
                );
                // RLSの有効/無効を設定
                if (tenantId) {
                  console.log(`Enable RLS tenantId: ${tenantId}`);
                  await transactionClient.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE);`;
                  await transactionClient.$executeRaw`SELECT set_config('app.bypass_rls', 'off', TRUE);`;
                } else {
                  console.log("Disable RLS");
                  await transactionClient.$executeRaw`SELECT set_config('app.current_tenant_id', ${(-1).toString()}, TRUE)`; // 無効な値をセット
                  await transactionClient.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`;
                }
                const result = await transactionClient[model][operation](args);
                return result;
              } else if (transaction.kind === "batch") {
                // Sequential operations（バッチ型）の場合
                console.log("Sequential operations");
                throw new Error(
                  "Sequential operationsは対応しないため、Interactive transactionを使用してください",
                );
              }
            }

            // prismaExtensionを使用しているとPrisma.skipが正しく動作しないバグがある
            // そのため、Prisma.skipを変換する処理を挟むことでruntime errorを回避している
            // TODO: 一旦transaction以外の場合だけ対策しているため、transactionの場合は別途実装する
            // https://github.com/prisma/prisma/issues/25845
            const removePrismaSkip = (obj: any): any => {
              if (typeof obj !== "object" || obj === null) return obj;
              if (Object.getPrototypeOf(obj) !== Object.prototype) return obj;

              // if it's an empty object, return Prisma.skip
              if (Object.getOwnPropertyNames(obj).length === 0)
                return Prisma.skip;

              return Object.entries(obj as Record<string, unknown>).reduce(
                (acc, [key, value]: [string, unknown]) => {
                  acc[key] = removePrismaSkip(value);
                  return acc;
                },
                {} as Record<string, any>,
              );
            };

            // トランザクションを使用しない場合
            const result = await prisma.$transaction(async (tx) => {
              // RLSの有効/無効を設定
              if (tenantId) {
                await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`;
                await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'off', TRUE)`;
              } else {
                await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${(-1).toString()}, TRUE)`; // 無効な値をセット
                await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`;
              }
              return query(removePrismaSkip(args));
            });
            return result;
          },
        },
      },
    }),
  );
};

/** tenantIdにRLSが適用されたPrismaClientExtensionを返す */
export const tenantGuardedExtension = (tenantId: string) => {
  return prismaExtension(tenantId);
};

/** RLSが無効なPrismaClientExtensionを返す */
export const bypassedExtension = () => {
  return prismaExtension(null);
};

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_APP_URL as string, // RLSが無効なROOTユーザーを、RLSが有効なAPPユーザーで上書きする
      },
    },
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = db;
