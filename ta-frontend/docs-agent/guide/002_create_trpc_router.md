## tRPC ルーター作成ガイド

### 1. はじめに

このガイドでは、プロジェクトにおける tRPC ルーターの作成方法について説明します。tRPC を使用することで、タイプセーフな API を効率的に開発できます。

### 2. 実装パターンの選択フロー

tRPC ルーターのエンドポイントを作成する際には、アクセス権限に応じて適切なプロシージャを選択する必要があります。

- **公開 API (認証不要):**
  - ログイン処理など、認証されていないユーザーからのアクセスを許可する場合
  - **`publicProcedure`** を使用します。
- **認証済みユーザー向け API:**
  - ログインしている一般ユーザーからのアクセスを許可する場合
  - 一般的なデータ取得・操作に使用します。
  - テナント分離が自動的に適用されます。
  - **`protectedUserProcedure`** を使用します。
- **テナント管理者向け API:**
  - 特定のテナントの管理者権限を持つユーザーからのアクセスを許可する場合
  - テナント内の管理操作に使用します。
  - テナント分離が自動的に適用されます。
  - **`protectedTenantAdminProcedure`** を使用します。
- **システム管理者向け API:**
  - システム全体の管理者権限を持つユーザーのみアクセスを許可する場合
  - テナント横断的な操作やシステム設定などに使用します。
  - **`protectedAdminProcedure`** を使用します。

### 3. 詳細パターン解説

#### 3.1. 基本的なルーター構造

新しいルーターファイル (`src/server/api/routers/機能名.ts`) を作成し、以下の基本構造に従います。

```typescript
import { z } from "zod";
import {
  createTRPCRouter,
  protectedUserProcedure,
  protectedAdminProcedure,
  publicProcedure,
} from "../trpc";

export const exampleRouter = createTRPCRouter({
  // ルーターの各エンドポイント (プロシージャ) を定義
});
```

#### 3.2. エンドポイント (プロシージャ) の実装例

ルーター内には、`query` (データ取得) や `mutation` (データ変更) を定義します。

```typescript
export const exampleRouter = createTRPCRouter({
  // クエリの例 (単一データ取得)
  get: protectedUserProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Prisma を使ってデータベースから取得
      // ctx.session.user や ctx.db が利用可能
      return ctx.db.example.findUnique({ where: { id: input.id } });
    }),

  // クエリの例 (リスト取得)
  getAll: protectedUserProcedure.query(async ({ ctx }) => {
    // ログインユーザー情報からテナントIDを取得
    const account = await ctx.db.account.findUnique({
      where: { email: ctx.session.user.email },
    });
    if (!account) {
      throw new Error("アカウントが見つかりません"); // エラーハンドリング
    }
    // テナントIDでフィルタリングして取得 (RLSがある場合、このwhere句は不要な場合もある)
    return ctx.db.example.findMany({
      where: { tenantId: account.tenantId },
      orderBy: { createdAt: "asc" },
    });
  }),

  // ミューテーションの例 (データ作成)
  create: protectedUserProcedure
    .input(
      z.object({
        // zod で入力バリデーション
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { email: ctx.session.user.email },
      });
      if (!account) {
        throw new Error("アカウントが見つかりません");
      }
      // Prisma を使ってデータベースに作成
      return ctx.db.example.create({
        data: {
          ...input,
          tenantId: account.tenantId, // テナントIDを付与
        },
      });
    }),

  // ミューテーションの例 (データ更新)
  update: protectedUserProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.example.update({
        where: { id }, // 更新対象を特定 (RLSにより自テナントのデータのみ対象)
        data, // 更新内容
      });
    }),

  // ミューテーションの例 (データ削除)
  delete: protectedUserProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.example.delete({
        where: { id: input.id }, // 削除対象を特定 (RLSにより自テナントのデータのみ対象)
      });
    }),
});
```

#### 3.3. 入力バリデーション

- エンドポイントへの入力値は、`zod` を用いて必ずバリデーションを行います。
- これにより、予期しないデータ型や不正な値がバックエンド処理に渡るのを防ぎ、型安全性を保証します。
- 必須項目 (`.min(1)` など) と任意項目 (`.optional()`) を明確に定義してください。

```typescript
// zod によるバリデーションの例
.input(z.object({
  name: z.string().min(1).max(100), // 必須、最小1文字、最大100文字
  email: z.string().email(),        // 必須、メール形式
  age: z.number().int().positive().optional(), // 任意、整数、正の数
  tags: z.array(z.string()).optional(), // 任意、文字列の配列
}))
```

#### 3.4. エラーハンドリング

- 処理中にエラーが発生した場合 (例: データが見つからない、権限がない) は、`TRPCError` を使用して適切なエラーコードとメッセージをクライアントに返却します。
- これにより、クライアント側でエラーに応じた処理を実装しやすくなります。

```typescript
import { TRPCError } from "@trpc/server";

// 例: データが見つからない場合
if (!data) {
  throw new TRPCError({
    code: "NOT_FOUND", // 事前定義されたエラーコード
    message: "指定されたデータが見つかりませんでした。",
  });
}

// 例: 権限がない場合
if (!isAdmin) {
  throw new TRPCError({
    code: "FORBIDDEN", // または "UNAUTHORIZED"
    message: "この操作を行う権限がありません。",
  });
}
```

#### 3.5. テナント ID の考慮

- 本プロジェクトはマルチテナントアーキテクチャを採用しています。
- `protectedUserProcedure` および `protectedAdminProcedure` を使用する場合、コンテキスト (`ctx`) から取得できるユーザー情報に基づいて、自動的にテナント ID によるデータの絞り込みや、データ作成時のテナント ID 付与が行われます（内部実装による）。
- データアクセス時には、常に Prisma の RLS (Row Level Security) ポリシーが適用され、他のテナントのデータにアクセスできないようになっています。`getAll` の例のように、明示的に `tenantId` で絞り込むコードは RLS があれば必須ではありませんが、ロジックの明確化のために記述することもあります。

### 4. 各ファイルの役割と責務分担

tRPC 関連のファイルとその役割は以下の通りです。

```
src/
  server/
    api/
      routers/      # 【開発者が主に作成・編集】各機能ごとのルーター定義 (例: user.ts, product.ts)
        - 各ファイルが特定のドメインやリソースに関するAPIエンドポイントをグループ化します。
      root.ts       # 【ルーター追加時に編集】すべてのルーターを集約するファイル
        - `routers/` 内で作成された個別のルーターをインポートし、一つの `appRouter` としてまとめます。
      trpc.ts       # 【基本的に編集不要】tRPCの初期設定、コンテキスト定義、プロシージャ (public, protectedUser, protectedAdmin) の定義
        - tRPC のバックエンド設定の中心です。データベース接続やセッション情報をコンテキスト (`ctx`) としてプロシージャに渡します。
trpc/
  client.tsx        # 【基本的に編集不要】クライアントサイドのtRPC設定 (React Query連携)
    - tRPC クライアントを作成し、React アプリケーション全体で利用可能にします。Next.js の App Router と連携します。
  queryClient.ts    # 【基本的に編集不要】React Query のクライアント設定
    - データフェッチングライブラリである React Query の設定を行います (キャッシュ時間など)。
  server.ts         # 【基本的に編集不要】サーバーサイドのヘルパー関数 (APIハンドラなど)
    - 主に Next.js の API ルート (`src/app/api/trpc/[trpc]/route.ts`) で使用される tRPC サーバーへのリクエストを処理するためのヘルパーが含まれます。
```

新しい機能の API を追加する際は、主に `src/server/api/routers/` に新しいルーターファイルを作成し、`src/server/api/root.ts` にそのルーターを登録します。

### 5. 命名規則 (厳守)

#### 5.1. 命名規則

- **ルーターファイル名:** 機能を表す単数形の名詞をキャメルケースで (例: `userAccount.ts`, `productOrder.ts`)。
- **ルーターオブジェクト名:** ファイル名に合わせて `〇〇Router` (例: `userAccountRouter`, `productOrderRouter`)。
- **エンドポイント (プロシージャ) 名:**
  - **取得 (Query):**
    - 単一取得: `get` (ID などで特定する場合), `getBy[識別子]` (例: `getByEmail`)
    - リスト取得: `getAll`
  - **作成 (Mutation):** `create`
  - **更新 (Mutation):** `update`
  - **削除 (Mutation):** `delete`
  - **その他の操作 (Mutation):** `動詞 + 名詞` (例: `sendInvitationEmail`, `generateSalesReport`)。操作内容が明確にわかるように命名します。

### 6. セキュリティ考慮事項

- **認証・認可:** 必ず適切なプロシージャ (`public`, `protectedUser`, `protectedTenantAdmin`, `protectedAdmin`) を選択し、意図しないアクセスを防いでください。
- **データ露出:** クライアントに返すデータは必要最小限に留め、パスワードハッシュなどの機密情報を含めないでください。Prisma の `select` や `include` を適切に使用します。
- **SQL インジェクション対策:** Prisma のクエリビルダーや ORM 機能を使用し、生の SQL 文字列を直接組み立てないでください。これにより、SQL インジェクションのリスクを大幅に低減できます。
- **入力バリデーション:** `zod` による厳格な入力バリデーションは、予期せぬ入力による脆弱性を防ぐ上で不可欠です。
