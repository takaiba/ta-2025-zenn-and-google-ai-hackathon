# セットアップガイド

このガイドではta-backend-mlプロジェクトのセットアップ方法について説明します。

## 事前準備

以下のツールとサービスが必要です：

- Docker と Docker Compose
- Python 3.9以上
- 必要なAPIキー：
  - OpenAI API キー
  - Azure Speech API キー（サブスクリプションキーと接続キー）
  - 必要に応じてその他のサービスキー

## インストール手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-organization/ta-backend-ml.git
cd ta-backend-ml
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成し、必要な環境変数を設定します：

```bash
cp .env.example .env
```

以下の環境変数を設定してください：

```
OPENAI_API_KEY=your_openai_api_key
AZURE_SUBSCRIPTION_KEY=your_azure_subscription_key
AZURE_CONNECTION_KEY=your_azure_connection_key
```

### 3. Dockerイメージのビルド

以下のコマンドでDockerイメージをビルドします：

```bash
make build
# または
docker compose build
```

### 4. データベース設定

ta-frontendリポジトリからPrismaスキーマを取得し生成します：

```bash
make generate
```

注意：この操作には前提として`ta-frontend`リポジトリが同じ親ディレクトリに存在している必要があります。

### 5. アプリケーションの起動

```bash
make serve
# または
docker compose up
```

デタッチドモードで起動する場合：

```bash
make serve-detached
# または
docker compose up -d
```


## 開発者用セットアップ

追加の開発依存関係をインストールするには：

```bash
pip install -r requirements-dev.txt
```

pre-commitフックを有効にするには：

```bash
pre-commit install
```

## トラブルシューティング

- **Prisma生成エラー**: `make generate`が失敗する場合は、以下を試してください：
  ```bash
  prisma py fetch --force
  ```

- **データベース接続エラー**: ta-frontendのMySQLコンテナが実行中であることを確認してください。

## 関連リポジトリ

- [ta-frontend](https://github.com/your-organization/ta-frontend) - フロントエンドコードとデータベース設定 
