# QA³ Backend ML - テストガイド概要

このプロジェクトには、動作確認のための複数のテスト方法が用意されています。

## 📚 ドキュメント

- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - 詳細な動作確認ガイド
- **[QUICK_START.md](QUICK_START.md)** - クイックスタートガイド
- **[QA3_SETUP.md](QA3_SETUP.md)** - セットアップ手順

## 🚀 クイックテスト

### 1. サービスの起動
```bash
# 環境変数を設定
cp .env.example .env
# .envファイルを編集

# サービスを起動
make serve
```

### 2. ヘルスチェック
```bash
# 基本的なヘルスチェック
make test-health

# または直接curlで確認
curl http://localhost:8000/api/healthcheck
```

### 3. APIテスト
```bash
# 自動APIテストの実行
make test-api

# パフォーマンステスト付き
make test-api-full
```

### 4. インタラクティブテスト
```bash
# 対話的なテストツールを起動
make test-interactive
```

## 🧪 テストツール

### 1. **scripts/test_api.sh**
- すべてのAPIエンドポイントを自動的にテスト
- ヘルスチェック、Celeryワーカー、データベース接続を確認
- パフォーマンステスト機能付き

使用方法:
```bash
# 基本テスト
./scripts/test_api.sh

# パフォーマンステスト付き
./scripts/test_api.sh --with-performance
```

### 2. **scripts/interactive_test.py**
- インタラクティブなメニュー形式のテストツール
- 個別のAPIエンドポイントをテスト
- ジョブの進行状況をリアルタイムモニタリング

使用方法:
```bash
# インタラクティブモード
python3 scripts/interactive_test.py

# すべてのテストを自動実行
python3 scripts/interactive_test.py --all

# ヘルスチェックのみ
python3 scripts/interactive_test.py --health
```

## 📊 モニタリング

### Flower（Celeryモニタリング）
```bash
# ブラウザで開く
open http://localhost:5555
```

### ログの確認
```bash
# すべてのログ
make logs

# 特定のサービス
make logs-web
make logs-worker
make logs-redis
```

### Redisの確認
```bash
# Redis CLIに接続
docker exec -it ta-backend-ml-redis redis-cli

# キューの確認
KEYS celery*
LLEN celery

# ジョブの状態確認
KEYS job:*
```

## 🔍 トラブルシューティング

### よくある問題

1. **ポートが使用中**
   ```bash
   lsof -i :8000
   lsof -i :6379
   make down && make serve-build
   ```

2. **データベース接続エラー**
   - `.env`ファイルの`DATABASE_ROOT_URL`を確認
   - 外部PostgreSQLサーバーが稼働しているか確認

3. **Celeryタスクが実行されない**
   ```bash
   # ワーカーの状態確認
   docker compose ps celery_worker
   docker compose logs celery_worker
   ```

## 📝 テスト例

### 基本的なテストフロー
```bash
# 1. ヘルスチェック
curl http://localhost:8000/api/healthcheck

# 2. テスト実行
curl -X POST http://localhost:8000/api/v1/test/execute \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "test-1",
    "test_config_id": "config-1",
    "account_id": "account-1",
    "mode": "omakase",
    "url": "https://example.com"
  }'

# 3. ステータス確認
curl http://localhost:8000/api/v1/test/status/{session_id}
```

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. [TESTING_GUIDE.md](TESTING_GUIDE.md)のトラブルシューティングセクション
2. `make logs`でエラーログを確認
3. `make test-health`で基本的な接続を確認

---

詳細な手順と追加のテスト方法については、[TESTING_GUIDE.md](TESTING_GUIDE.md)を参照してください。