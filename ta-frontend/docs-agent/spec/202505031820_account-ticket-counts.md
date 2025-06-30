# 実装計画

## 概要

各アカウント (`Account`) が作成した `ConversationTicket` の数を集計し、システム管理者向けに一覧表示する画面を新たに作成します。

## 手順

### 1. データベース設定

- [ ] 1.1 スキーマ確認
  - `prisma/schema.prisma` を確認し、`Account` と `ConversationTicket` のリレーション（`ConversationTicket.createdById` -> `Account.id`）が正しく定義されていることを確認します。
  - データベーススキーマの変更は不要です。

### 2. バックエンド実装

- [ ] 2.1 tRPC ルーター作成
  - `src/server/api/routers/analytics.ts` ファイルを新規作成します。
- [ ] 2.2 集計エンドポイント実装 (`getAccountTicketCounts`)
  - `analyticsRouter` 内に `getAccountTicketCounts` という名前の `query` を作成します。
  - プロシージャとして `protectedAdminProcedure` を使用します。
  - Prisma (`ctx.db`) を使用して `Account` を `findMany` し、`_count` で関連する `ConversationTicket` の数を取得します。
  - アカウント情報 (id, name, email など) とチケット数を返します。
  - 参照ファイル: `src/server/api/routers/tenant.ts`, `src/server/api/trpc.ts`
- [ ] 2.3 ルート ルーターへの登録
  - `src/server/api/root.ts` を編集し、作成した `analyticsRouter` を `appRouter` にマージします。
  - 参照ファイル: `src/server/api/root.ts`

### 3. フロントエンド実装

- [ ] 3.1 新規画面用ディレクトリ作成
  - `src/app/analytics/ticket-counts/` ディレクトリを作成します。
- [ ] 3.2 新規ページファイル作成
  - `src/app/analytics/ticket-counts/page.tsx` を作成します。
  - このファイルでは `AccountTicketCountTable` コンポーネントをレンダリングします。
  - 参照ファイル: `src/app/accounts/page.tsx`
- [ ] 3.3 一覧表示コンポーネント作成 (`AccountTicketCountTable`)
  - `src/app/_components/domain/analytics/AccountTicketCountTable/` ディレクトリを作成します。
  - [ ] 3.3.1 `container.tsx` (Server Component)
    - `api.analytics.getAccountTicketCounts` を呼び出してデータを取得します。
    - 取得したデータを `presentation.tsx` に渡します。
    - 参照ファイル: `src/app/_components/domain/accounts/ManageAccountArea/container.tsx` (パターン2準拠)
  - [ ] 3.3.2 `presentation.tsx` (Client Component)
    - `container.tsx` からデータを受け取ります。
    - 共通コンポーネントの `Table` または `div`/`table` タグでアカウント名、メール、チケット数を表示します。
    - 参照ファイル: `src/app/_components/domain/accounts/ManageAccountArea/presentation.tsx`
  - [ ] 3.3.3 `index.ts`
    - `container.tsx` を `AccountTicketCountTable` としてエクスポートします。
- [ ] 3.4 サイドメニューへの追加
  - `src/app/_components/layout/MainSideBar/menuItems.tsx` を編集します。
  - 「アカウント別チケット数」などの名前で `/analytics/ticket-counts` へのリンクを追加します。
  - システム管理者 (`session.data?.user.role === "ADMIN"`) のみ表示されるようにします。
  - 参照ファイル: `src/app/_components/layout/MainSideBar/menuItems.tsx`

### 4. テスト

- [ ] 4.1 ユニットテスト
  - `analyticsRouter.getAccountTicketCounts` のロジックをテストします。
- [ ] 4.2 E2E テスト
  - システム管理者でログインし、サイドバーの表示と `/analytics/ticket-counts` 画面の表示・データロードを確認します。

### 5. ドキュメント作成

- [ ] 5.1 (任意) 必要に応じて機能に関するドキュメントを更新します。

# 潜在的な課題

- アカウント数が多い場合のパフォーマンス: 初期実装ではページネーション等は考慮しませんが、将来的に必要になる可能性があります。
- 権限管理: システム管理者のみがアクセスできるよう `protectedAdminProcedure` を使用し、サイドバーの表示条件も厳密に設定します。
