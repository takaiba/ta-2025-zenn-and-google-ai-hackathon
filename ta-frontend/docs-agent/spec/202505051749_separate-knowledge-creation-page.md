# 実装計画

## 概要

ナレッジ管理画面の構成を変更し、ナレッジ一覧表示とナレッジ作成機能を別々の画面に分離します。

- ナレッジ一覧は `/knowledge` 画面 (`ManageKnowledgeArea`) で表示します。
- ナレッジ作成は新しい `/create-knowledge` 画面 (`CreateKnowledgeArea`) で表示します。
- サイドメニューに「ナレッジ作成」へのリンクを追加します。

## 手順

### 1. データベース設定

- [ ] 変更なし

### 2. バックエンド実装

- [ ] 変更なし

### 3. フロントエンド実装

- [ ] 3.1 `CreateKnowledgeArea` コンポーネントの作成

  - `src/app/_components/domain/knowledge/CreateKnowledgeArea` ディレクトリを作成します。
  - `container.tsx`, `presentation.tsx`, `index.ts` を作成します。
  - `ManageKnowledgeArea/presentation.tsx` からナレッジ作成（タブが "create" の場合）のロジックと JSX を `CreateKnowledgeArea/presentation.tsx` に移動します。
  - 必要な Props (knowledgeTools, userGroups, isMobile など) を受け取るように `container.tsx` と `presentation.tsx` を調整します。データ取得は Container で行います。
  - 参照ファイル:
    - `src/app/_components/domain/knowledge/ManageKnowledgeArea/presentation.tsx` (移動元)
    - `src/app/_components/domain/tenants/ManageTenantArea/container.tsx` (Container の例)
    - `src/app/_components/domain/tenants/ManageTenantArea/presentation.tsx` (Presentation の例)

- [ ] 3.2 `ManageKnowledgeArea` コンポーネントの修正

  - `src/app/_components/domain/knowledge/ManageKnowledgeArea/presentation.tsx` を編集します。
  - タブ切り替え (`selectedTab` state と関連ロジック) を削除します。
  - ナレッジ作成関連の JSX (タブが "create" の場合の表示) を削除します。
  - ヘッダーやボタン配置を調整し、ナレッジ一覧表示に特化させます。
  - 不要になった Props を削除します。
  - 参照ファイル:
    - `src/app/_components/domain/knowledge/ManageKnowledgeArea/presentation.tsx` (修正対象)

- [ ] 3.3 `/create-knowledge` 画面の作成

  - `src/app/create-knowledge/page.tsx` ファイルを作成します。
  - `CreateKnowledgeArea` コンポーネントをインポートしてレンダリングします。
  - 参照ファイル:
    - `src/app/knowledge/page.tsx` (類似のページファイル)
    - `src/app/tenants/page.tsx` (シンプルなページファイルの例)

- [ ] 3.4 サイドメニューへのリンク追加
  - `src/app/_components/layout/MainSideBar/presentation.tsx` を編集します。
  - ナビゲーションリストに「ナレッジ作成」の項目を追加し、`/create-knowledge` へのリンクを設定します。アイコンは `AddIcon` など適切なものを選択します。
  - 参照ファイル:
    - `src/app/_components/layout/MainSideBar/presentation.tsx` (修正対象)

# 潜在的な課題

- `CreateKnowledgeArea` に渡す Props の特定と Container での取得処理の実装。
- サイドメニューのアイコン選定とスタイリング調整。
