# 実装計画

## 概要

KnowledgeGroup と UserGroup の間に n:1 のリレーションを確立し、関連するUIコンポーネント（一覧表示とフォーム）を更新します。これにより、ナレッジグループを特定のユーザーグループに紐付けて管理できるようになります。

## 手順

### 1. データベース設定

- [ ] 1.1 `KnowledgeGroup` モデルに `UserGroup` へのリレーションフィールドを追加
  - `KnowledgeGroup` モデルに `userGroupId` (String, optional) と `userGroup` (Relation) フィールドを追加します。
  - `UserGroup` モデルに `knowledgeGroups` (Relation, List) フィールドを追加します。
  - 参照ファイル: `prisma/schema.prisma`

### 2. バックエンド実装

- [ ] 2.1 `knowledgeGroup` tRPC router の更新
  - [ ] 2.1.1 `create` ミューテーションの更新
    - `input` に `userGroupId: z.string().optional()` を追加します。
    - `create`処理で `userGroupId` を含めてデータを保存するようにします。
    - 参照ファイル: `src/server/api/routers/knowledgeGroup.ts`
  - [ ] 2.1.2 `update` ミューテーションの更新
    - `input` に `userGroupId: z.string().optional().nullable()` を追加します。（nullableは解除を考慮）
    - `update`処理で `userGroupId` を含めてデータを更新するようにします。
    - 参照ファイル: `src/server/api/routers/knowledgeGroup.ts`
  - [ ] 2.1.3 `get` クエリの更新
    - `include` オプションを使用して、関連する `userGroup` (nameのみで可) を取得するようにします。
    - 参照ファイル: `src/server/api/routers/knowledgeGroup.ts`
  - [ ] 2.1.4 `getAll` クエリの更新
    - `include` オプションを使用して、関連する `userGroup` (nameのみで可) を取得するようにします。
    - 参照ファイル: `src/server/api/routers/knowledgeGroup.ts`

### 3. フロントエンド実装

- [ ] 3.1 `ManageKnowledgeGroupArea` コンポーネントの更新
  - [ ] 3.1.1 データ型の更新
    - `getAll` クエリのレスポンス型に合わせて、`knowledgeGroup` の型定義に `userGroup` (idとnameを含むオブジェクト、optional) を追加します。
  - [ ] 3.1.2 表示の更新
    - ナレッジグループ一覧の各項目に、紐づく `userGroup` の名前を表示するカラムまたは情報を追加します。ユーザーグループが設定されていない場合は「なし」または空欄を表示します。
    - 参照ファイル: `src/app/_components/domain/knowledgeGroup/ManageKnowledgeGroupArea/presentation.tsx`
- [ ] 3.2 `KnowledgeGroupForm` コンポーネントの更新 (作成・編集モーダル内)
  - [ ] 3.2.1 `schema.ts` の更新
    - `knowledgeGroupSchema` に `userGroupId: z.string().optional()` を追加します。
    - 参照ファイル: `src/app/_components/domain/knowledgeGroup/ManageKnowledgeGroupForm/schema.ts`
  - [ ] 3.2.2 フォームUIの更新
    - `userGroup` を選択するための `Select` コンポーネントをフォーム内に追加します。
    - 選択肢のデータは、`userGroupRouter.getAll` を使用して取得します。
    - 初期値として、編集時は既存の `userGroupId` をセットします。
    - 参照ファイル: `src/app/_components/domain/knowledgeGroup/ManageKnowledgeGroupForm/presentation.tsx`
  - [ ] 3.2.3 フォーム送信処理の更新
    - フォーム送信時に `userGroupId` を含めるようにします。
    - `actions.ts` 内の `upsertKnowledgeGroup` (または関連する Server Action) を修正し、`userGroupId` をバックエンドに渡すようにします。
    - 参照ファイル: `src/app/_components/domain/knowledgeGroup/ManageKnowledgeGroupForm/actions.ts` (または関連するactionsファイル)

# 潜在的な課題

- **既存データへの対応:** `userGroupId` をオプショナルにすることで既存データへの影響は小さいが、既存ナレッジグループにユーザーグループを紐付ける運用をどうするか検討が必要になる場合がある。
- **パフォーマンス:** ユーザーグループの数が多い場合に、フォームの選択肢表示のパフォーマンスに注意が必要。`Combobox` のサーバーサイド検索機能やページネーションを検討する必要が出るかもしれない (今回はまずシンプルな実装を目指す)。
- **認可:** `KnowledgeGroup` と `UserGroup` のリレーションが増えることによる、アクセス制御への影響がないか確認する。特にRLSポリシーが適切に機能するか。
- **UI/UX:** ユーザーグループ未選択の場合の表示や、選択解除の操作性など、細かいUI/UXの調整が必要になる場合がある。
