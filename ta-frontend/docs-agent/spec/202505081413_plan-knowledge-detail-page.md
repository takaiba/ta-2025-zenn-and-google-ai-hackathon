# 実装計画

## 概要

ナレッジグループIDに基づいてナレッジデータを一覧表示するナレッジ詳細画面を作成します。ページパスは `/knowledge/[knowledgeGroupId]` とし、Next.js の Dynamic Routing を利用します。

## 手順

### 1. データベース設定

- [x] 1.1 `KnowledgeData` と `KnowledgeGroup` のリレーション確認
  - `prisma/schema.prisma` を確認し、`KnowledgeData` が `knowledgeGroupId` を持ち、`KnowledgeGroup` と正しく関連付けられていることを確認済み。
  - **スキーマ変更は不要です。**

### 2. バックエンド実装

- [ ] 2.1 tRPCルーターにナレッジデータ取得処理を追加
  - `src/server/api/routers/knowledge.ts` に新しいクエリを追加します。
  - **エンドポイント名:** `getByKnowledgeGroupId`
  - **入力:** `z.object({ knowledgeGroupId: z.string() })`
  - **処理:**
    - `knowledgeGroupId` を使用して、該当する `KnowledgeData` のリストを `ctx.db.knowledgeData.findMany` で取得します。
    - `where: { knowledgeGroupId: input.knowledgeGroupId, tenantId: ctx.session.user.tenantId }` のようにテナントIDでの絞り込みも行います。RLSが有効でも明示的に指定することが推奨されます。
    - `orderBy: { createdAt: "desc" }` のように作成日時の降順でソートします。
  - **プロシージャ:** `protectedUserProcedure` を使用します。
  - **参照ファイル:** `src/server/api/routers/knowledge.ts` (既存の `getAll` や `get` メソッドを参考に)

### 3. フロントエンド実装

- [ ] 3.1 ナレッジデータ一覧表示コンポーネント作成

  - `src/app/_components/domain/knowledge/KnowledgeDetailArea/` ディレクトリを新規作成します。
  - このディレクトリ内に以下のファイルを作成します（実装パターン2: データ表示コンポーネント (静的)）。
  - [ ] 3.1.1 `container.tsx` (Server Component)
    - `knowledgeGroupId` を props で受け取ります。
    - `api.knowledge.getByKnowledgeGroupId.query({ knowledgeGroupId })` を呼び出してナレッジデータを取得します。
    - 取得したデータを `KnowledgeDetailPresentation` コンポーネントに渡します。
    - `knowledgeGroupId` が不正またはデータが存在しない場合のフォールバック処理を検討します（例: "データがありません" と表示）。
    - **参照ファイル:** `src/app/_components/domain/knowledgeGroup/ManageKnowledgeGroupArea/container.tsx`
  - [ ] 3.1.2 `presentation.tsx` (Client Component)
    - `KnowledgeData` のリストを props で受け取ります。
    - 受け取ったデータをテーブル形式（タイトル、説明、作成日時など）で表示します。
    - Tailwind CSS を使用してスタイリングします。
    - **参照ファイル:** `src/app/_components/domain/knowledgeGroup/ManageKnowledgeGroupArea/presentation.tsx` (テーブル表示の参考に)
  - [ ] 3.1.3 `index.ts`
    - `KnowledgeDetailAreaContainer` を `KnowledgeDetailArea` としてエクスポートします。

- [ ] 3.2 ナレッジ詳細ページ作成

  - `src/app/knowledge/[knowledgeGroupId]/page.tsx` を新規作成します。
  - ページコンポーネントは `async` 関数として定義し、`params` から `knowledgeGroupId` を取得します。
  - `KnowledgeDetailArea` コンポーネントを呼び出し、取得した `knowledgeGroupId` を props として渡します。
  - **参照ファイル:** `src/app/knowledge-groups/page.tsx` (シンプルなページコンポーネントの参考に), `src/app/page.tsx` (`searchParams` の代わりに `params` を利用する形)

# 潜在的な課題

- **エラーハンドリング:**
  - `knowledgeGroupId` が存在しない場合、または該当するナレッジデータが存在しない場合のUI表示を明確にする必要があります（例: "指定されたナレッジグループは見つかりませんでした"、"このグループにはナレッジデータが登録されていません" など）。
- **大量データ表示:**
  - 一つのナレッジグループに大量のナレッジデータが存在する場合のパフォーマンスとUI（ページネーションの実装など）を考慮する必要があります。今回のスコープではシンプルな一覧表示としますが、将来的には検討が必要です。
- **認証・認可:**
  - `protectedUserProcedure` を使用しますが、さらに細かいアクセス制御（特定のユーザーグループのみアクセス可など）が必要な場合は、追加のロジックが必要になります。
- **UIの具体性:**
  - ナレッジデータをどのように一覧表示するか（表示項目、レイアウト）について、より詳細なデザインが必要になる場合があります。今回はタイトル、説明、作成日時などを想定しています。
