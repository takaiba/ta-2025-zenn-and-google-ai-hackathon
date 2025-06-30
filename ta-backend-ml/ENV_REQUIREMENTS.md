# QA³ Backend ML - 環境変数要件

## 現在の.envで提供されている環境変数

✅ **利用可能な環境変数:**
- `DATABASE_ROOT_URL` - PostgreSQLデータベース接続URL
- `TENANT_PREFIX` - テナントプレフィックス
- `DEFAULT_TENANT_ID` - デフォルトテナントID
- `GOOGLE_APPLICATION_CREDENTIALS` - Google Cloud認証情報ファイルパス

## 🔴 追加が必要な環境変数

以下の環境変数を.envファイルに追加してください：

### 1. OpenAI API設定
```bash
# OpenAI APIキー（必須）
OPENAI_API_KEY="your_openai_api_key_here"
```

### 2. Django設定
```bash
# Django Secret Key（必須）
# 以下のコマンドで生成可能: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
SECRET_KEY="django-secret-key-here"

# デバッグモード（開発環境ではTrue、本番環境ではFalse）
DEBUG="True"
```

### 3. Sentry設定（オプション）
```bash
# エラートラッキング用（オプション）
SENTRY_DSN=""
```

## 📝 環境変数の使用方法

### Docker Composeの設定について

現在のDocker Compose設定では：
1. **`.env`ファイル** - アプリケーション固有の設定（APIキー、データベースURLなど）
2. **`environment`セクション** - コンテナ間通信の設定（Redis接続情報）

この分離により：
- セキュリティ: APIキーなどの機密情報は.envファイルで管理
- 可搬性: コンテナ間通信の設定はdocker-compose.ymlで固定
- 明確性: どの設定がどこから来るかが明確

### 改善案

もし設定をシンプルにしたい場合は、以下の方法があります：

1. **すべて.envで管理する場合:**
   ```yaml
   services:
     web:
       env_file:
         - .env
       # environmentセクションを削除
   ```
   この場合、.envに以下を追加：
   ```bash
   REDIS_HOST=redis
   REDIS_PORT=6379
   REDIS_URL=redis://redis:6379/0
   ```

2. **現在の方法を維持する場合（推奨）:**
   - 外部サービス接続情報 → .env
   - 内部サービス接続情報 → docker-compose.yml

## 🚀 設定手順

1. 上記の必要な環境変数を.envファイルに追加
2. Docker Composeを再起動：
   ```bash
   make down
   make serve-build
   ```

## 📋 環境変数チェックリスト

- [ ] `OPENAI_API_KEY` - OpenAI APIキー
- [ ] `SECRET_KEY` - Django Secret Key
- [ ] `DEBUG` - デバッグモード設定
- [ ] `SENTRY_DSN` - Sentryエラートラッキング（オプション）