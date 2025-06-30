# QA³ Backend ML - クイックスタートガイド

## 起動方法

### 1. 環境変数の設定
```bash
cp .env.example .env
# .envファイルを編集して、以下の値を設定：
# - DATABASE_ROOT_URL: 外部のPostgreSQLサーバーのURL
# - OPENAI_API_KEY: OpenAI APIキー
```

### 2. サービスの起動

**簡単な起動方法:**
```bash
make serve
```

**初回起動や設定変更後:**
```bash
make serve-build
```

**バックグラウンドで起動:**
```bash
make serve-detached
```

**段階的な起動（推奨）:**
```bash
make quick-start
```

### 3. サービスの確認

起動後、以下のURLでサービスにアクセスできます：
- Web API: http://localhost:8000/api/healthcheck
- Flower (Celeryモニタリング): http://localhost:5555

### 4. ログの確認
```bash
# すべてのサービスのログ
make logs

# 特定のサービスのログ
make logs-web       # Webサーバー
make logs-worker    # Celeryワーカー
make logs-redis     # Redis
```

### 5. サービスの停止
```bash
make down
```

## トラブルシューティング

### ポートが使用中の場合
```bash
# 使用中のポートを確認
lsof -i :8000
lsof -i :6379
lsof -i :5555

# プロセスを終了してから再起動
make down
make serve-build
```

### データベース接続エラーの場合
```bash
# コンテナをすべて削除して再構築
make down-volumes
make serve-build
```

### Prismaエラーの場合
```bash
# Prismaクライアントを再生成
make prisma-generate
make prisma-push
```

## 便利なコマンド

```bash
# Djangoシェルに入る
make shell

# マイグレーションの実行
make migrate

# スーパーユーザーの作成
make createsuperuser

# ヘルプの表示
make help
```