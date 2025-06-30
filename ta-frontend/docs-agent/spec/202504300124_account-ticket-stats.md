# 実装計画

## 概要

各アカウントが作成した `ConversationTicket` の数を集計し、一覧表示する画面を新たに作成します。アカウント名とチケット作成数をテーブル形式で表示します。

## 手順

### 1. データベース設定

- [ ] 1.1 `schema.prisma` の確認
  - `Account` テーブルと `ConversationTicket` テーブル、および `ConversationTicket.accountId` のリレーションが存在することを確認します。
  - 参照ファイル: `prisma/schema.prisma`
- [ ] 1.2 マイグレーション（不要）
  - 既存のスキーマを使用するため、マイグレーションは不要です。

### 2. バックエンド実装

- [ ] 2.1 tRPC ルーターの作成/編集
  - アカウントごとの `ConversationTicket` 作成数を取得する新しい tRPC プロシージャを追加します。
  - `src/server/api/routers/account.ts` に `getTicketCountsByAccount` のようなプロシージャを追加するか、新しいルーターファイルを作成します。
  - Prisma の `groupBy` と `_count` を使用して集計クエリを実装します。
  - 返り値は `{ accountId: string, accountName: string, ticketCount: number }[]` のような形式を想定します。
  - 参照ファイル: `src/server/api/routers/account.ts`, `src/server/api/root.ts`
- [ ] 2.2 tRPC プロシージャの実装
  - 2.1 で定義したプロシージャの具体的な処理を実装します。
  - ログインユーザーのテナントに属するアカウントのみを対象とするようにフィルタリングします。
  - Prisma クライアントを使用してデータベースからデータを取得します。
    ```typescript
    // 例: Prismaクエリのイメージ
    await prisma.account.findMany({
      where: {
        tenantId: ctx.session.tenantId, // ログインユーザーのテナントID
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            conversationTicket: true,
          },
        },
      },
      orderBy: {
        name: "asc", // アカウント名でソート
      },
    });
    // 返り値を { accountId, accountName, ticketCount } の形式に整形する
    ```
  - 参照ファイル: `src/server/api/routers/account.ts` (または新規ファイル)

### 3. フロントエンド実装

- [ ] 3.1 統計表示用コンポーネントの作成
  - アカウントごとのチケット作成数を表示するテーブルコンポーネントを作成します。
  - `src/app/_components/domain/accountStats` ディレクトリを作成し、`AccountTicketStatsArea` コンポーネント (Container/Presentationパターン) を作成します。
  - Container (`container.tsx`) で tRPC プロシージャを呼び出してデータを取得します。TanStack Query (パターン②) の使用を検討します（リアルタイム性は不要ですが、キャッシュやローディング状態管理の点でメリットがあります）。
  - Presentation (`presentation.tsx`) で取得したデータをテーブル表示します。`src/app/_components/common/Table` など既存の汎用コンポーネントがあれば活用します。
  - テーブルのカラムは「アカウント名」「チケット作成数」とします。
  - 参照ファイル: `src/app/_components/domain/accounts/ManageAccountArea/`, `src/app/_components/common/Table/` (もし存在すれば)
- [ ] 3.2 新規ページの作成
  - 統計情報を表示するための新しいページ `src/app/account-ticket-stats/page.tsx` を作成します。
  - ページコンポーネント内で 3.1 で作成した `AccountTicketStatsArea` コンポーネントを呼び出します。
  - ページのタイトルや基本的なレイアウトを設定します。
  - 参照ファイル: `src/app/accounts/page.tsx`, `src/app/_components/layout/Layout/`
- [ ] 3.3 サイドメニューへの追加
  - `src/app/_components/layout/MainSideBar/presentation.tsx` (または関連ファイル) を編集し、作成した `/account-ticket-stats` ページへのリンクをサイドバーに追加します。
  - 適切なアイコンとラベルを設定します（例: 「アカウント統計」）。
  - 参照ファイル: `src/app/_components/layout/MainSideBar/presentation.tsx`, `src/app/_components/layout/MainSideBarButton/presentation.tsx`

### 4. テスト (任意)

- [ ] 4.1 ユニットテスト
  - tRPC プロシージャのロジックをテストします。
- [ ] 4.2 E2Eテスト
  - 画面が表示され、データが正しく表示されることを確認します。

### 5. ドキュメント作成 (任意)

- [ ] 5.1 機能概要
  - 作成した画面の機能概要をドキュメントに残します。

# 潜在的な課題

- **パフォーマンス**: アカウント数やチケット数が非常に多い場合、集計クエリやフロントエンドでのレンダリングに時間がかかる可能性があります。必要に応じて、クエリの最適化（インデックス追加など）やページネーション、仮想スクロールなどの導入を検討します。
- **アクセス制御**: 現状はテナント内の全アカウントが表示されますが、将来的にロールに基づいたアクセス制御が必要になる可能性があります。
