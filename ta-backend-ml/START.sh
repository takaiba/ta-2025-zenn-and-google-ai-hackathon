#!/bin/bash

# QA³ Backend ML クイックスタートスクリプト

echo "=================================="
echo "QA³ Backend ML - 起動中..."
echo "=================================="

# 必要な環境変数の確認と追加
if ! grep -q "OPENAI_API_KEY" .env 2>/dev/null; then
    echo ""
    echo "⚠️  必要な環境変数が.envファイルに不足しています"
    echo ""
    echo "以下の内容を.envファイルの最後に追加してください:"
    echo "----------------------------------------"
    cat << 'EOF'
# OpenAI API設定（必須）
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Django設定（必須）
SECRET_KEY="django-insecure-$(openssl rand -hex 32)"
DEBUG=True

# Sentry設定（オプション - 空でOK）
SENTRY_DSN=""
EOF
    echo "----------------------------------------"
    echo ""
    echo "追加後、再度このスクリプトを実行してください。"
    echo ""
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 既存のコンテナを停止
echo "既存のコンテナを停止中..."
docker compose down 2>/dev/null || true

# イメージをビルド
echo "Dockerイメージをビルド中..."
docker compose build

# サービスを起動
echo "サービスを起動中..."
docker compose up -d

# 起動を待つ
echo "サービスの起動を待っています..."
sleep 5

# ヘルスチェック
echo "ヘルスチェック中..."
if curl -s http://localhost:8000/api/healthcheck > /dev/null; then
    echo "✅ Web APIが正常に起動しました"
else
    echo "⚠️  Web APIの起動に時間がかかっています"
fi

echo ""
echo "=================================="
echo "✅ 起動完了!"
echo "=================================="
echo ""
echo "サービスURL:"
echo "  - Web API: http://localhost:8000"
echo "  - Flower:  http://localhost:5555"
echo ""
echo "ログを確認: make logs"
echo "停止: make down"
echo ""