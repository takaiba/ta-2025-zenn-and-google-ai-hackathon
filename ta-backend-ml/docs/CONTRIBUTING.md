# 開発者ガイド

このドキュメントでは、ta-backend-mlプロジェクトに貢献するための手順とガイドラインを説明します。

## 開発環境のセットアップ

1. リポジトリをクローンします
   ```bash
   git clone https://github.com/your-organization/ta-backend-ml.git
   cd ta-backend-ml
   ```

2. 必要な依存関係をインストールします
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

3. pre-commitフックを設定します
   ```bash
   pre-commit install
   ```

4. `.env.example`をコピーして`.env`ファイルを作成し、必要な環境変数を設定します
   ```bash
   cp .env.example .env
   # エディタで.envファイルを開き、必要な値を設定します
   ```

## コーディング規約

このプロジェクトでは以下のコーディング規約を採用しています：

- [PEP 8](https://pep8.org/) - Pythonコードスタイルガイド
- [Ruff](https://docs.astral.sh/ruff/) - 高速なPythonリンター
- [mypy](https://mypy.readthedocs.io/) - 静的型チェック

コード提出前に以下のコマンドを実行してください：

```bash
# コードのフォーマット
ruff format .

# リンティング
ruff check .

# 型チェック
mypy .
```

プロジェクトには自動フォーマッタとリンターが設定されています。コミット前に自動的にチェックが行われます。

## ブランチ戦略

このプロジェクトでは以下のブランチ戦略を採用しています：

- `main` - 本番環境用のコード
- `release` - リリース準備用のコード
- `feature/*` - 新機能開発用のブランチ
- `bugfix/*` - バグ修正用のブランチ

新しい機能を開発する場合は、`feature/`プレフィックスを付けたブランチを作成してください：

```bash
git checkout -b feature/your-feature-name origin/release
```

## コミットメッセージの規約

コミットメッセージは以下の形式に従ってください：

```
<type>: <short summary>

<optional detailed description>
```

`type`には以下のいずれかを使用してください：

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマットなど）
- `refactor`: バグ修正でも新機能追加でもないコード変更
- `perf`: パフォーマンス改善のためのコード変更
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更

## プルリクエストのプロセス

1. 変更内容に対応するIssueが存在することを確認します
2. 適切なブランチ（`feature/`, `bugfix/`など）を作成します
3. 変更を実装し、テストを追加します
4. 変更をコミットし、プッシュします
5. プルリクエストを作成します
   - テンプレートに従って詳細を記入してください
   - 関連するIssueをリンクしてください
6. レビューを受け、必要に応じて修正します
7. マージが承認されたら、変更がメインブランチにマージされます

## テスト

新しい機能やバグ修正を追加する場合は、適切なテストを追加してください。テストは`tests/`ディレクトリに配置します。

テストを実行するには以下のコマンドを使用します：

```bash
pytest
```

特定のテストファイルのみを実行するには：

```bash
pytest tests/your_test_file.py
```

## ドキュメント

コードの変更に伴い、必要に応じてドキュメントを更新してください。以下のドキュメントが特に重要です：

- `README.md` - プロジェクトの概要
- `docs/` - 詳細なドキュメント
- インラインコメントとdocstring

## ヘルプと質問

質問や問題がある場合は、GitHubのIssueを作成するか、プロジェクトの管理者に連絡してください。 
