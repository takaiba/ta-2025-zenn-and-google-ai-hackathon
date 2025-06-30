# ta-backend-ml ドキュメント

このディレクトリには、ta-backend-mlプロジェクトに関する公式ドキュメントが含まれています。

## ドキュメント一覧

### 概要と設計

- [ARCHITECTURE.md](./ARCHITECTURE.md) - プロジェクトのアーキテクチャの概要
- [technology-stack.md](./technology-stack.md) - 使用している技術スタックの詳細
- [directory.md](./directory.md) - プロジェクトのディレクトリ構成と説明

### セットアップとデプロイ

- [SETUP.md](./SETUP.md) - インストールとセットアップ手順
- [API.md](./API.md) - API仕様と使用方法

### 開発ガイド

- [CONTRIBUTING.md](./CONTRIBUTING.md) - 開発者向けの貢献ガイドライン

### トラブルシューティング

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 一般的な問題と解決策

## 画像・図表

- [images/](./images/) - ドキュメントで使用されている画像ファイル

## その他のリソース

- [プロジェクトのREADME.md](../README.md) - プロジェクトの概要
- [内部Notionドキュメント](https://www.notion.so/ibaragi/Azure-Whisper-ChatGPT-a0b3a6aca04246b0aaebcaeee3cf96b0) - 詳細な内部ドキュメント

## ドキュメントの更新

ドキュメントに変更や追加を行う場合は、以下のガイドラインに従ってください：

1. Markdownフォーマットを使用する
2. 画像やダイアグラムは `images/` ディレクトリに配置する
3. コード例やコマンドには適切な言語タグを付ける（例：```bash, ```python）
4. 変更後はこの README.md ファイルも必要に応じて更新する

## ドキュメント作成のルール

- 日本語での記述を基本とする
- 技術用語は原則として英語のままとし、必要に応じて日本語の説明を添える
- コマンド例は実際に動作することを確認したものを記載する
- スクリーンショットやダイアグラムは最新の状態を維持する 

## ta-backend-ml プロジェクト

このプロジェクトは、以下の機能を提供するバックエンドAPIサービスです：

- Google Vertex AI Agent Builderとの連携
- URLスクレイピング機能
- Webコンテンツのクローリングと検索
- Google Geminiを使用したPDFのグラウンディング処理
- ブラウザレンダリングとPDF変換処理
- ローカルでの複数PDFの処理
- ベクトルデータベース検索機能
- ファイルアップロード機能

## APIサーバ起動方法

以下の順にコマンドを打つ。ta-frontendの方でDB用のコンテナ（mysql_db）が起動していないとエラーになるので注意。
```
make serve
make runserver
```

## 必要なもの
- Docker
- Google Cloud APIキー
- OpenAI API TOKEN（一部機能で使用）

## セットアップ

### .envの作成

`.env.example`から`.env`を作成し、以下の項目を埋める

```
OPENAI_API_KEY=
GOOGLE_APPLICATION_CREDENTIALS=
```

### イメージ作成

以下のコマンドで、APIサーバー用のイメージをビルドする

```
make build
```

### APIサーバーの立ち上げ

以下のコマンドで、APIサーバー用のコンテナを立ち上げる。

```
make run
```

## URL処理API呼び出し方法

特定のURLをスクレイピングするAPIを呼び出す例：

```
curl -X POST http://localhost:8081/api/v1/dify/process_url_scrape -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d '{"url": "https://example.com"}'
```

## クローラーAPI呼び出し方法

Webクローリングを開始するAPIを呼び出す例：

```
curl -X POST http://localhost:8081/api/v1/dify/process_crawler -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d '{"url": "https://example.com"}'
```

---

## その他の機能

### PDF処理

PDFファイルを処理し、Google Geminiを使って分析する機能があります。
詳細は`project/app/process_pdf_local.py`を参照してください。

### ベクトルDB検索

ベクトルデータベースを使用したコンテンツ検索機能があります。
詳細は`project/app/process_vector_db_search.py`を参照してください。 
