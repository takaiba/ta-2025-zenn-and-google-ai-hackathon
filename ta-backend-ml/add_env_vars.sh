#!/bin/bash

# 必要な環境変数を.envファイルに追加するスクリプト

echo "QA³ Backend ML - 環境変数セットアップ"
echo "====================================="

# .envファイルの存在確認
if [ ! -f .env ]; then
    echo "❌ .envファイルが見つかりません"
    exit 1
fi

# バックアップ作成
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ .envファイルのバックアップを作成しました"

# 必要な環境変数を追加
echo "" >> .env
echo "# ===== QA³ Backend ML Settings =====" >> .env

# OPENAI_API_KEYの確認と追加
if ! grep -q "OPENAI_API_KEY" .env; then
    echo "" >> .env
    echo "# OpenAI API設定（必須）" >> .env
    echo "# https://platform.openai.com/api-keys で取得" >> .env
    echo 'OPENAI_API_KEY="sk-your-openai-api-key-here"' >> .env
    echo "✅ OPENAI_API_KEY を追加しました（要更新）"
else
    echo "ℹ️  OPENAI_API_KEY は既に設定されています"
fi

# SECRET_KEYの確認と追加
if ! grep -q "SECRET_KEY" .env; then
    # ランダムなシークレットキーを生成
    SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())' 2>/dev/null || echo "django-insecure-$(openssl rand -hex 32)")
    echo "" >> .env
    echo "# Django設定（必須）" >> .env
    echo "SECRET_KEY=\"$SECRET_KEY\"" >> .env
    echo "DEBUG=True" >> .env
    echo "✅ SECRET_KEY を生成して追加しました"
else
    echo "ℹ️  SECRET_KEY は既に設定されています"
fi

# SENTRY_DSNの確認と追加
if ! grep -q "SENTRY_DSN" .env; then
    echo "" >> .env
    echo "# Sentry設定（オプション）" >> .env
    echo 'SENTRY_DSN=""' >> .env
    echo "✅ SENTRY_DSN を追加しました（オプション）"
else
    echo "ℹ️  SENTRY_DSN は既に設定されています"
fi

echo ""
echo "====================================="
echo "✅ 環境変数の追加が完了しました！"
echo ""
echo "⚠️  重要: OPENAI_API_KEY を実際の値に更新してください"
echo ""
echo "次のステップ:"
echo "1. .envファイルを編集してOPENAI_API_KEYを設定"
echo "2. make serve でサービスを起動"
echo ""