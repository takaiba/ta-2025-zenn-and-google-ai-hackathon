# 実装計画

## 概要

ナレッジグループ機能を新たに実装します。この機能により、複数のナレッジデータをグループとして管理できるようになります。画面構成は既存のテナント管理機能と同様のUI/UXを提供します。

## 手順

### 1. データベース設定

- [ ] 1.1 `KnowledgeGroup` テーブルを `prisma/schema.prisma` に追加
  - 詳細:
    - `id`: String @id @default(cuid())
    - `title`: String
    - `createdAt`: DateTime @default(now()) @map("created_at")
    - `updatedAt`: DateTime @updatedAt @map("updated_at")
    - `tenantId`: String @default(dbgenerated("current_setting('app.current_tenant_id'::text)")) @map("tenant_id")
    - `tenant`: Relation to `Tenant` (fields: [tenantId], references: [id])
    - `knowledgeData`: `KnowledgeData[]` (リレーション定義)
  - 参照ファイル: `prisma/schema.prisma` (Tenantテーブルなど)
- [ ] 1.2 `KnowledgeData` テーブルに `KnowledgeGroup` とのリレーションを追加
  - 詳細:
    - `knowledgeGroupId`: String? @map("knowledge_group_id")
    - `knowledgeGroup`: `KnowledgeGroup?` @relation(fields: [knowledgeGroupId], references: [id])
  - 参照ファイル: `prisma/schema.prisma`
- [ ] 1.3 RLS (Row Level Security) ポリシーの検討と設定
  - 詳細: 新しく作成する `KnowledgeGroup` テーブルに対して、テナントベースのアクセス制限ポリシーを定義する必要があります。既存テーブルのRLS設定を参考にしてください。
  - 参照ファイル: `prisma/migrations/xxxxxxxxxxxxxx_apply_rls/migration.sql` 等のRLS関連マイグレーションファイル
- [ ] 1.4 Prismaマイグレーションの実行
  - 詳細: `prisma/schema.prisma` の変更をデータベースに適用するため、`sudo make migrate` コマンドを実行するよう促してください。開発者にマイグレーション名（例: `add_knowledge_group_table`）を尋ねる必要があるかもしれません。

### 2. バックエンド実装

- [ ] 2.1 `knowledgeGroup` tRPC ルーター (`src/server/api/routers/knowledgeGroup.ts`) の新規作成
  - 詳細: CRUD操作（作成、読み取り、更新、削除）のためのエンドポイントを実装します。各プロシージャは適切なアクセス権限（`protectedUserProcedure`）で保護します。
  - 参照ファイル: `src/server/api/routers/tenant.ts`
  - [ ] 2.1.1 `create` プロシージャの実装
    - 入力: `title: string`
    - 処理: 新しいナレッジグループを作成します。
  - [ ] 2.1.2 `get` プロシージャの実装
    - 入力: `id: string`
    - 処理: 指定されたIDのナレッジグループを取得します。
  - [ ] 2.1.3 `getAll` プロシージャの実装
    - 処理: 現在のテナントかつ参加しているユーザーグループに属する全てのナレッジグループを取得します。（将来的にはページネーションやソート機能の追加も検討）
  - [ ] 2.1.4 `update` プロシージャの実装
    - 入力: `id: string`, `title: string`
    - 処理: 指定されたIDのナレッジグループの情報を更新します。
  - [ ] 2.1.5 `delete` プロシージャの実装
    - 入力: `id: string`
    - 処理: 指定されたIDのナレッジグループを削除します。関連する `KnowledgeData` の `knowledgeGroupId` を `null` に更新する処理も必要です。
- [ ] 2.2 ルートtRPCルーター (`src/server/api/root.ts`) への `knowledgeGroupRouter` の登録
  - 詳細: 作成した `knowledgeGroupRouter` をアプリケーションのメインルーターに組み込みます。
  - 参照ファイル: `src/server/api/root.ts`

### 3. フロントエンド実装

- [ ] 3.1 ナレッジグループ管理エリアコンポーネント (`ManageKnowledgeGroupArea`) の作成
  - 場所: `src/app/_components/domain/knowledgeGroup/ManageKnowledgeGroupArea/`
  - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantArea/`
  - [ ] 3.1.1 `container.tsx` (Server Component)
    - 詳細: `api.knowledgeGroup.getAll()` を使用してナレッジグループのリストを取得し、`Presentation` コンポーネントに渡します。
    - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantArea/container.tsx`
  - [ ] 3.1.2 `presentation.tsx` (Client Component)
    - 詳細: ナレッジグループの一覧をテーブル形式で表示します。各行には編集・削除のためのメニューボタン (`ManageKnowledgeGroupMenu`) を配置します。新規作成ボタンをクリックすると `ManageKnowledgeGroupModal` を表示します。
    - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantArea/presentation.tsx`
  - [ ] 3.1.3 `index.ts`
- [ ] 3.2 ナレッジグループフォームコンポーネント (`ManageKnowledgeGroupForm`) の作成
  - 場所: `src/app/_components/domain/knowledgeGroup/ManageKnowledgeGroupForm/`
  - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantForm/`
  - [ ] 3.2.1 `schema.ts`
    - 詳細: ナレッジグループの `title` に対するZodスキーマを定義します。
    - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantForm/schema.ts`
  - [ ] 3.2.2 `actions.ts` (Server Actions)
    - 詳細: `createKnowledgeGroup`, `updateKnowledgeGroup`のServer Actionを実装します。成功時には `revalidatePath("/knowledge-groups")` を呼び出してキャッシュを更新します。
    - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantForm/actions.ts`
  - [ ] 3.2.3 `presentation.tsx` (Client Component)
    - 詳細: Conformを利用してフォーム (`title` の入力フィールド) を構築します。`useTransition` を用いて、Server Actionの実行状態（ローディング、成功、エラー）を管理し、ユーザーにフィードバックします。
    - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantForm/presentation.tsx`
  - [ ] 3.2.4 `index.ts`
- [ ] 3.3 ナレッジグループモーダルコンポーネント (`ManageKnowledgeGroupModal`) の作成
  - 場所: `src/app/_components/domain/knowledgeGroup/ManageKnowledgeGroupModal/`
  - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantModal/`
  - [ ] 3.3.1 `presentation.tsx` (Client Component)
    - 詳細: 汎用の `Dialog` コンポーネント内に `ManageKnowledgeGroupForm` をラップします。作成モードと編集モードでモーダルのタイトルやボタンのテキストを動的に変更します。
    - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantModal/presentation.tsx`
  - [ ] 3.3.2 `index.ts`
- [ ] 3.4 ナレッジグループ削除フォームコンポーネント (`DeleteKnowledgeGroupForm`) の作成
  - 場所: `src/app/_components/domain/knowledgeGroup/DeleteKnowledgeGroupForm/`
  - 参照ファイル: `src/app/_components/domain/tenants/DeleteTenantForm/`
  - [ ] 3.4.1 `actions.ts` (Server Actions)
    - 詳細: `deleteKnowledgeGroup` のServer Actionを実装します。成功時には `revalidatePath("/knowledge-groups")` を呼び出してキャッシュを更新します。
    - 参照ファイル: `src/app/_components/domain/tenants/DeleteTenantForm/actions.ts`
  - [ ] 3.4.2 `presentation.tsx` (Client Component)
    - 詳細: 削除対象のナレッジグループ名を表示し、削除実行の確認メッセージとボタンを配置します。削除処理は `actions.ts` のServer Actionを呼び出します。`useTransition` を使用してローディング状態を管理します。
    - 参照ファイル: `src/app/_components/domain/tenants/DeleteTenantForm/presentation.tsx`
  - [ ] 3.4.3 `index.ts`
- [ ] 3.5 ナレッジグループメニューコンポーネント (`ManageKnowledgeGroupMenu`) の作成
  - 場所: `src/app/_components/domain/knowledgeGroup/ManageKnowledgeGroupMenu/`
  - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantMenu/`
  - [ ] 3.5.1 `presentation.tsx` (Client Component)
    - 詳細: 汎用の `PopupMenu` コンポーネントを使用して、編集アクション（モーダル表示）と削除アクション（確認ダイアログ表示後にServer Action実行）のトリガーを提供します。
    - 参照ファイル: `src/app/_components/domain/tenants/ManageTenantMenu/presentation.tsx`
  - [ ] 3.5.2 `index.ts`
- [ ] 3.6 ナレッジグループ管理ページ (`src/app/knowledge-groups/page.tsx`) の作成
  - 詳細: `ManageKnowledgeGroupArea` コンポーネントをレンダリングします。
  - 参照ファイル: `src/app/tenants/page.tsx`
- [ ] 3.7 サイドバーへのメニュー項目の追加
  - 詳細: `src/app/_components/layout/MainSideBar/presentation.tsx` （または関連するサイドバー設定ファイル）を編集し、「ナレッジグループ管理」という新しいナビゲーションリンクを追加します。適切なアイコンを選択します。
  - 参照ファイル: `src/app/_components/layout/MainSideBar/presentation.tsx`

# 潜在的な課題

- **既存ナレッジデータへの影響:** 新規に `knowledgeGroupId` を `KnowledgeData` テーブルに追加するため、既存のナレッジデータに対するデフォルト値の設定や、マイグレーション時のデータ移行戦略を慎重に検討する必要があります（今回はnullableとしたため大きな影響はない想定ですが、既存データが多い場合は注意）。
- **RLSポリシーの複雑性:** `KnowledgeGroup` にもテナントごとのアクセス制御を確実に適用する必要があり、既存のRLSポリシーとの整合性を保ちつつ正しく設定することが求められます。
- **UIコンポーネントの再利用性:** 「テナント管理と同様」という要件を満たすため、既存コンポーネントの構造をよく理解し、適切に再利用または参考にすることが重要です。完全に一致しない部分の調整も必要になります。
