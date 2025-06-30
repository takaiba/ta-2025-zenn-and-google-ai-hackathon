# QA³ Backend ML - 動作確認ガイド

## 目次
1. [事前準備](#事前準備)
2. [基本的な動作確認](#基本的な動作確認)
3. [API エンドポイントのテスト](#api-エンドポイントのテスト)
4. [Celery ワーカーの動作確認](#celery-ワーカーの動作確認)
5. [エンドツーエンドテスト](#エンドツーエンドテスト)
6. [トラブルシューティング](#トラブルシューティング)

## 事前準備

### 1. 環境変数の確認
```bash
# .envファイルが正しく設定されているか確認
cat .env | grep -E "(DATABASE_ROOT_URL|OPENAI_API_KEY|REDIS)"
```

必須環境変数:
- `DATABASE_ROOT_URL`: PostgreSQLデータベースのURL
- `OPENAI_API_KEY`: OpenAI APIキー
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_URL`: Redis接続情報

### 2. サービスの起動確認
```bash
# すべてのコンテナが起動しているか確認
docker compose ps

# 期待される出力:
# NAME                       SERVICE         STATUS    PORTS
# ta-backend-ml-celery-beat  celery_beat     running
# ta-backend-ml-celery-worker celery_worker  running
# ta-backend-ml-flower       flower          running   0.0.0.0:5555->5555/tcp
# ta-backend-ml-redis        redis           running   0.0.0.0:6379->6379/tcp
# ta-backend-ml-web          web             running   0.0.0.0:8000->8000/tcp
```

## 基本的な動作確認

### 1. ヘルスチェック
```bash
# Web APIのヘルスチェック
curl http://localhost:8000/api/healthcheck

# 期待される応答:
# {"status": "ok", "service": "qa3-backend-ml"}
```

### 2. Redis接続確認
```bash
# Redisに接続
docker exec -it ta-backend-ml-redis redis-cli ping

# 期待される応答:
# PONG
```

### 3. Flower（Celeryモニタリング）確認
```bash
# ブラウザで開く
open http://localhost:5555

# または curlで確認
curl -I http://localhost:5555

# 期待される応答:
# HTTP/1.1 200 OK
```

### 4. データベース接続確認
```bash
# Djangoシェルでデータベース接続を確認
docker exec -it ta-backend-ml-web python manage.py shell << EOF
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT 1")
    print("Database connection: OK")
EOF
```

### 5. Prisma接続確認
```bash
# Prismaの接続を確認
docker exec -it ta-backend-ml-web python -c "
from prisma import Prisma
prisma = Prisma()
prisma.connect()
print('Prisma connection: OK')
prisma.disconnect()
"
```

## API エンドポイントのテスト

### 1. テスト実行API
```bash
# テストセッションを開始
curl -X POST http://localhost:8000/api/v1/test/execute \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "test-project-1",
    "test_config_id": "test-config-1",
    "account_id": "test-account-1",
    "mode": "omakase",
    "url": "https://example.com"
  }'

# 期待される応答例:
# {
#   "session_id": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "queued",
#   "message": "Test execution has been queued"
# }
```

### 2. テストステータス確認
```bash
# セッションIDを使用してステータスを確認
SESSION_ID="上記で取得したsession_id"
curl http://localhost:8000/api/v1/test/status/$SESSION_ID

# 期待される応答例:
# {
#   "status": "running",
#   "updated_at": "2024-01-01T00:00:00",
#   "type": "test_execution"
# }
```

### 3. バグ分析API
```bash
# バグ分析をリクエスト
curl -X POST http://localhost:8000/api/v1/bug/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "test_session_id": "test-session-1",
    "screenshot": "base64_encoded_image_data",
    "page_url": "https://example.com/page",
    "error_message": "Button click failed"
  }'

# 期待される応答例:
# {
#   "job_id": "bug-analysis-job-id",
#   "status": "queued",
#   "message": "Bug analysis has been queued"
# }
```

### 4. レポート生成API
```bash
# レポート生成をリクエスト
curl -X POST http://localhost:8000/api/v1/report/generate \
  -H "Content-Type: application/json" \
  -d '{
    "test_session_id": "test-session-1",
    "format": "pdf"
  }'

# 期待される応答例:
# {
#   "job_id": "report-gen-job-id",
#   "status": "queued",
#   "message": "Report generation has been queued"
# }
```

### 5. シナリオ生成API
```bash
# シナリオ生成をリクエスト
curl -X POST http://localhost:8000/api/v1/scenario/generate \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "test-project-1",
    "description": "ユーザーがログインして商品を購入するフロー",
    "url": "https://example.com"
  }'

# 期待される応答例:
# {
#   "job_id": "scenario-gen-job-id",
#   "status": "queued",
#   "message": "Scenario generation has been queued"
# }
```

## Celery ワーカーの動作確認

### 1. ワーカーの状態確認
```bash
# Celeryワーカーのログを確認
docker compose logs celery_worker | tail -20

# アクティブなワーカーを確認
docker exec -it ta-backend-ml-web celery -A project inspect active

# 登録されたタスクを確認
docker exec -it ta-backend-ml-web celery -A project inspect registered
```

### 2. Flowerでの確認
ブラウザで http://localhost:5555 を開いて以下を確認:
- **Workers**: アクティブなワーカーの数と状態
- **Tasks**: 実行中・完了したタスクの一覧
- **Broker**: Redisの接続状態

### 3. タスクキューの確認
```bash
# Redisのキューを確認
docker exec -it ta-backend-ml-redis redis-cli

# Redis CLIで以下のコマンドを実行:
# キューのリストを確認
127.0.0.1:6379> KEYS celery*

# キューの長さを確認
127.0.0.1:6379> LLEN celery

# ジョブの状態を確認
127.0.0.1:6379> KEYS job:*
```

### 4. タスクの手動実行テスト
```bash
# Djangoシェルからタスクを手動実行
docker exec -it ta-backend-ml-web python manage.py shell << EOF
from app.queue_handlers import execute_test_task
result = execute_test_task.delay("test-job-id", {
    "project_id": "test-1",
    "test_config_id": "config-1",
    "account_id": "account-1",
    "mode": "omakase",
    "url": "https://example.com"
})
print(f"Task ID: {result.id}")
print(f"Task State: {result.state}")
EOF
```

## エンドツーエンドテスト

### 完全なフローのテスト
```bash
# 1. テストセッションを開始
SESSION_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/test/execute \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "e2e-test-project",
    "test_config_id": "e2e-test-config",
    "account_id": "e2e-test-account",
    "mode": "omakase",
    "url": "https://www.google.com"
  }')

echo "Session Response: $SESSION_RESPONSE"
SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.session_id')

# 2. ステータスを定期的に確認
for i in {1..10}; do
  echo "Checking status (attempt $i)..."
  curl -s http://localhost:8000/api/v1/test/status/$SESSION_ID | jq .
  sleep 5
done

# 3. Celeryワーカーのログを確認
docker compose logs celery_worker | grep $SESSION_ID

# 4. Redisでジョブの状態を確認
docker exec -it ta-backend-ml-redis redis-cli GET "job:$SESSION_ID"
```

## トラブルシューティング

### 1. ログの確認方法
```bash
# すべてのサービスのログ
make logs

# 特定のサービスのログ
docker compose logs -f web          # Webサーバー
docker compose logs -f celery_worker # Celeryワーカー
docker compose logs -f redis         # Redis

# エラーログのみ表示
docker compose logs web | grep -i error
docker compose logs celery_worker | grep -i error
```

### 2. よくある問題と解決方法

#### データベース接続エラー
```bash
# 接続情報を確認
docker exec -it ta-backend-ml-web python -c "
import os
print(f'DATABASE_ROOT_URL: {os.getenv(\"DATABASE_ROOT_URL\")}')
"

# psycopg2で直接接続テスト
docker exec -it ta-backend-ml-web python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(os.getenv('DATABASE_ROOT_URL'))
    print('Connection successful')
    conn.close()
except Exception as e:
    print(f'Connection failed: {e}')
"
```

#### Celeryタスクが実行されない
```bash
# ワーカーが起動しているか確認
docker compose ps celery_worker

# ワーカーのログを確認
docker compose logs celery_worker | tail -50

# Celeryの設定を確認
docker exec -it ta-backend-ml-web python -c "
from django.conf import settings
print(f'CELERY_BROKER_URL: {settings.CELERY_BROKER_URL}')
print(f'CELERY_RESULT_BACKEND: {settings.CELERY_RESULT_BACKEND}')
"
```

#### Prismaエラー
```bash
# Prismaクライアントを再生成
docker exec -it ta-backend-ml-web prisma generate

# Prismaのスキーマを確認
docker exec -it ta-backend-ml-web prisma validate
```

### 3. デバッグモードでの実行
```bash
# Djangoシェルでデバッグ
docker exec -it ta-backend-ml-web python manage.py shell

# Pythonデバッガーを使用
docker exec -it ta-backend-ml-web python -m pdb manage.py runserver
```

### 4. パフォーマンスモニタリング
```bash
# リソース使用状況を確認
docker stats

# Redis のメモリ使用量を確認
docker exec -it ta-backend-ml-redis redis-cli INFO memory

# Celeryワーカーの統計情報
docker exec -it ta-backend-ml-web celery -A project inspect stats
```

## 負荷テスト

### 簡単な負荷テスト
```bash
# Apache Benchを使用した負荷テスト（macOSの場合）
# 100リクエスト、同時実行数10
ab -n 100 -c 10 -p test_data.json -T "application/json" \
  http://localhost:8000/api/v1/test/execute

# test_data.jsonの内容
echo '{
  "project_id": "load-test",
  "test_config_id": "load-test-config",
  "account_id": "load-test-account",
  "mode": "omakase",
  "url": "https://example.com"
}' > test_data.json
```

## テストデータのクリーンアップ
```bash
# Redisのテストデータをクリア
docker exec -it ta-backend-ml-redis redis-cli FLUSHDB

# コンテナを停止してボリュームを削除
make down-volumes
```