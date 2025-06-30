# 実装計画

## 概要

`KnowledgeDetailArea` コンポーネントに、`ManageKnowledgeGroupArea` コンポーネントを参考にして、複数選択による一括削除機能、文字列検索機能、およびページネーション機能を実装します。これにより、特定のナレッジグループに属するナレッジデータの一覧画面の利便性を向上させます。

## 手順

### 1. データベース設定

- [ ] 1.1 `schema.prisma` の確認
  - 詳細: `KnowledgeData` モデルに必要なフィールド（検索対象、ページネーションに必要な情報など）が全て存在することを確認します。今回は既存フィールドで対応可能と判断されるため、変更は不要です。
  - 参照ファイル: `prisma/schema.prisma`

### 2. バックエンド実装

- [ ] 2.1 tRPC ルーター (`knowledge.ts`) の改修
  - [ ] 2.1.1 `getByKnowledgeGroupId` プロシージャの入力スキーマ変更
    - 詳細: `knowledgeGroupId` に加えて、`page` (number, optional), `limit` (number, optional), `searchWord` (string, optional) を受け取れるように `z.object` を拡張します。
    - 参照ファイル: `src/server/api/routers/knowledge.ts`, `src/server/api/routers/knowledgeGroup.ts` (getAllのinput参考)
  - [ ] 2.1.2 `getByKnowledgeGroupId` プロシージャのクエリロジック変更
    - 詳細:
      - Prisma の `findMany` 呼び出しに `skip`, `take` を追加し、ページネーションを実装します。デフォルトの `limit` 値を設定します（例: 20）。
      - `searchWord` が指定された場合、`title` フィールドに対する `contains` (部分一致、大文字・小文字区別なし) 検索条件を `where` 句に追加します。
      - クエリ結果として、ナレッジデータのリスト (`data`) に加えて、総アイテム数 (`total`) と1ページあたりのアイテム数 (`limit`) を含むオブジェクトを返すように変更します。
    - 参照ファイル: `src/server/api/routers/knowledge.ts` (getAllの実装参考)
  - [ ] 2.1.3 `deleteBulk` プロシージャの確認
    - 詳細: 既存の `deleteBulk` が今回の要件（IDリストを受け取って一括削除）を満たしていることを確認します。変更は不要の見込みです。
    - 参照ファイル: `src/server/api/routers/knowledge.ts`

### 3. フロントエンド実装

- [ ] 3.1 `KnowledgeDetailArea/container.tsx` の改修

  - [ ] 3.1.1 Props の追加
    - 詳細: `page` (number) と `searchWord` (string) を Props として受け取れるように型定義を修正します。
    - 参照ファイル: `src/app/_components/domain/knowledge/ManageKnowledgeGroupArea/container.tsx`
  - [ ] 3.1.2 データ取得処理の変更
    - 詳細: `api.knowledge.getByKnowledgeGroupId` を呼び出す際に、Props から受け取った `page` と `searchWord` を引数として渡すように変更します。
    - 参照ファイル: `src/app/_components/domain/knowledge/ManageKnowledgeGroupArea/container.tsx`
  - [ ] 3.1.3 `KnowledgeDetailPresentation` へ渡す Props の更新
    - 詳細: 取得したナレッジデータ (`data`, `total`, `limit`) と、現在の `searchWord`, `page` を `KnowledgeDetailPresentation` に渡します。
    - 参照ファイル: `src/app/_components/domain/knowledge/ManageKnowledgeGroupArea/container.tsx`

- [ ] 3.2 `KnowledgeDetailArea/presentation.tsx` の改修

  - [ ] 3.2.1 Props の型定義変更
    - 詳細: `knowledgeDataList` を、`data` (配列), `total` (数値), `limit` (数値) を含むオブジェクト型に変更します。また、`searchWord` (string) と `page` (number) を Props として受け取るようにします。
    - 参照ファイル: `src/app/_components/domain/knowledge/ManageKnowledgeGroupArea/presentation.tsx`
  - [ ] 3.2.2 状態管理の追加・変更
    - 詳細:
      - `page` state: `useState` で現在のページ番号を管理。Props から初期値を受け取る。
      - `searchWord` state: `useState` で現在の検索文字列を管理。Props から初期値を受け取る。
      - `selectedKnowledgeIds` state: 既存のものを活用。
      - `isPending` (from `useTransition`): ページ遷移や検索実行時のローディング状態管理。
    - 参照ファイル: `src/app/_components/domain/knowledge/ManageKnowledgeGroupArea/presentation.tsx`
  - [ ] 3.2.3 検索機能の実装
    - 詳細:
      - 検索入力フィールド (`<input type="text">`) をテーブル上部に追加。
      - `handleSearchWordChange` で入力値を `searchWord` state にセット。
      - `debouncedSearch` (lodashの`debounce`を使用) で遅延実行される `handleSearch` を呼び出す。
      - `handleSearch` で URL の `searchWord` パラメータを更新し (`router.replace(newUrl)`), 検索時は1ページ目に戻すように `page` パラメータも更新する。
    - 参照ファイル: `src/app/_components/domain/knowledge/ManageKnowledgeGroupArea/presentation.tsx` (検索UIとロジック)
  - [ ] 3.2.4 ページネーション機能の実装
    - 詳細:
      - テーブル下部に `Pagination` コンポーネントを設置。
      - `handlePageChange` で URL の `page` パラメータを更新し (`router.replace(newUrl)`), `page` state も更新。ページ変更時に `selectedKnowledgeIds` をリセット。
      - `Pagination` コンポーネントに必要な props (`page`, `limit`, `total`, `onChangePage`) を渡す。
    - 参照ファイル: `src/app/_components/domain/knowledge/ManageKnowledgeGroupArea/presentation.tsx` (ページネーションUIとロジック), `src/app/_components/common/Pagination/index.tsx`
  - [ ] 3.2.5 複数選択・一括削除機能のUI調整とロジック接続
    - 詳細:
      - テーブルヘッダーに全選択チェックボックスを設置。
      - 選択されたアイテムがある場合に「選択を削除」ボタンを表示。
      - 「選択を削除」ボタンクリック時に `handleDeleteSelected` を実行。
      - `handleDeleteSelected` 内で `deleteKnowledgeBulk` (from `actions.ts`) を呼び出し、成功後に `selectedKnowledgeIds` と `page` をリセットし、`router.refresh()` でデータを再取得。
    - 参照ファイル: `src/app/_components/domain/knowledge/ManageKnowledgeGroupArea/presentation.tsx` (一括削除ボタンとロジック), `src/app/_components/domain/knowledge/KnowledgeDetailArea/actions.ts`
  - [ ] 3.2.6 UIスタイルの調整
    - 詳細: `ManageKnowledgeGroupArea` と同様のテーブルレイアウト、検索バーの配置、ボタンのスタイルなどを適用します。
    - 参照ファイル: `src/app/_components/domain/knowledge/ManageKnowledgeGroupArea/presentation.tsx`

- [ ] 3.3 `src/app/knowledge/[knowledgeGroupId]/page.tsx` の改修
  - 詳細: `KnowledgeDetailAreaContainer` を呼び出す際に、URL の `searchParams` から `page` と `searchWord` を取得し、数値や文字列に変換して渡すようにします。`page` は未指定なら `1`、`searchWord` は未指定なら空文字とします。
  - 参照ファイル: `src/app/knowledge-groups/page.tsx` (ManageKnowledgeGroupAreaContainerの呼び出し箇所)

### 4. テスト (省略)

### 5. ドキュメント作成 (省略)

# 潜在的な課題

- **tRPC ルーターの `getByKnowledgeGroupId` の改修**: 既存のシンプルなデータ取得ロジックから、ページネーションと検索条件を考慮した複雑なものに変更するため、バグを生まないように注意深く実装する必要があります。特に Prisma のクエリ構築と、返すデータの構造（`data`, `total`, `limit` を含むオブジェクト）を正確に実装することが重要です。
- **フロントエンドの状態管理と副作用**: `presentation.tsx` で複数の状態（選択アイテム、現ページ、検索語）を管理し、それらが URL パラメータや Server Action と連携するため、状態の同期や副作用（データ再取得など）の管理が複雑になる可能性があります。`useTransition` や `router.refresh()`、`router.replace()` の使い分けを正確に行う必要があります。
- **UI/UXの一貫性**: `ManageKnowledgeGroupArea` の見た目と操作感を忠実に再現するためには、CSS やコンポーネントの組み合わせに細心の注意が必要です。
- **パフォーマンス**: データ量が多い場合に備え、tRPC ルーターでのデータベースクエリが効率的であること（例: 適切なインデックスが利用されているかなど）が望ましいですが、今回はクエリ変更が主なので、既存のインデックス状況に依存します。
