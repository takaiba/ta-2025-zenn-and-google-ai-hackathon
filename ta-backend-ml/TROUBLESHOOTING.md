# QA³ Backend ML - トラブルシューティングガイド

## 環境変数関連の問題

### 必要な環境変数の追加

現在の.envファイルに以下の環境変数を追加してください：

```bash
# OpenAI API設定（必須）
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Django設定（必須）
SECRET_KEY="django-insecure-your-secret-key-here"
DEBUG=True

# Sentry設定（オプション - 空でOK）
SENTRY_DSN=""
```

### 環境変数のチェック

```bash
# 環境変数が正しく設定されているか確認
make check-env
```

## データベース接続の問題

### 症状
- `psycopg2.OperationalError: could not connect to server`
- `Connection refused` エラー

### 解決方法

1. **DATABASE_ROOT_URLの確認**
   ```bash
   # 現在の設定
   DATABASE_ROOT_URL="postgresql://root:r7+0trOwKAIUSzxP@127.0.0.1:5432/common-frontend"
   ```
   
   Docker環境では自動的に`127.0.0.1`が`host.docker.internal`に変換されます。

2. **ホストマシンのPostgreSQLが起動しているか確認**
   ```bash
   # PostgreSQLのステータス確認
   pg_ctl status
   # または
   brew services list | grep postgresql
   ```

3. **PostgreSQLの接続設定確認**
   ```bash
   # postgresql.confでlisten_addressesを確認
   # '*' または 'localhost' になっているか
   ```

4. **ファイアウォール/セキュリティ設定**
   - ポート5432が開いているか確認
   - pg_hba.confで接続が許可されているか確認

## Docker関連の問題

### ポートが使用中
```bash
# 使用中のポートを確認
lsof -i :8000
lsof -i :6379
lsof -i :5555

# 既存のコンテナを停止
make down
docker compose down -v

# 再起動
make serve-build
```

### コンテナが起動しない
```bash
# ログを確認
docker compose logs web
docker compose logs celery_worker

# コンテナの状態を確認
docker compose ps

# イメージを再ビルド
docker compose build --no-cache
```

## Prisma関連の問題

### Prismaクライアントエラー
```bash
# Prismaクライアントを再生成
docker exec -it ta-backend-ml-web prisma generate

# スキーマを検証
docker exec -it ta-backend-ml-web prisma validate
```

### データベーススキーマの同期
```bash
# Prismaスキーマをプッシュ
docker exec -it ta-backend-ml-web prisma db push
```

## Celery関連の問題

### ワーカーが起動しない
```bash
# Celeryワーカーのログを確認
docker compose logs celery_worker

# Redisが正常に動作しているか確認
docker exec -it ta-backend-ml-redis redis-cli ping

# ワーカーを手動で起動してデバッグ
docker exec -it ta-backend-ml-web celery -A project worker --loglevel=debug
```

### タスクが実行されない
```bash
# Flowerで状態を確認
open http://localhost:5555

# キューの状態を確認
docker exec -it ta-backend-ml-redis redis-cli
> KEYS celery*
> LLEN celery
```

## 一般的なデバッグ手順

### 1. 環境変数の確認
```bash
make check-env
```

### 2. サービスの状態確認
```bash
docker compose ps
make health
```

### 3. ログの確認
```bash
# すべてのログ
make logs

# 特定のサービス
make logs-web
make logs-worker
```

### 4. コンテナ内でのデバッグ
```bash
# Djangoシェル
make shell
>>> from django.conf import settings
>>> print(settings.DATABASE_ROOT_URL)

# 直接コマンド実行
docker exec -it ta-backend-ml-web python -c "import os; print(os.environ)"
```

## よくある質問

### Q: OpenAI APIキーはどこで取得できますか？
A: https://platform.openai.com/api-keys で取得できます。

### Q: Django SECRET_KEYはどう生成すればいいですか？
A: 以下のコマンドで生成できます：
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### Q: データベースに接続できません
A: 以下を確認してください：
1. ホストマシンでPostgreSQLが起動している
2. ポート5432が使用可能
3. 認証情報が正しい
4. DATABASE_ROOT_URLが正しく設定されている

## サポート

問題が解決しない場合は、以下の情報を含めて報告してください：
1. `make check-env` の出力
2. `docker compose ps` の出力
3. エラーログ（`make logs` の関連部分）
4. 実行したコマンドと期待した結果