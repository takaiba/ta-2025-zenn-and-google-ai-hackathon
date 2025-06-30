#!/usr/bin/env python3
"""
環境変数チェックスクリプト
必要な環境変数が設定されているか確認します
"""

import os
import sys

# 必須の環境変数
REQUIRED_VARS = {
    'DATABASE_ROOT_URL': 'PostgreSQLデータベース接続URL',
    'OPENAI_API_KEY': 'OpenAI APIキー',
    'SECRET_KEY': 'Django Secret Key',
}

# オプションの環境変数
OPTIONAL_VARS = {
    'SENTRY_DSN': 'Sentry DSN（エラートラッキング）',
    'DEBUG': 'Djangoデバッグモード',
    'TENANT_PREFIX': 'テナントプレフィックス',
    'DEFAULT_TENANT_ID': 'デフォルトテナントID',
}

def check_env():
    """環境変数をチェック"""
    print("=" * 60)
    print("QA³ Backend ML - 環境変数チェック")
    print("=" * 60)
    
    missing_required = []
    missing_optional = []
    
    # 必須環境変数のチェック
    print("\n[必須環境変数]")
    for var, description in REQUIRED_VARS.items():
        value = os.environ.get(var)
        if value:
            # 秘密情報は一部をマスク
            if 'KEY' in var or 'SECRET' in var or 'PASSWORD' in var:
                masked_value = value[:8] + '...' + value[-4:] if len(value) > 12 else '***'
                print(f"✓ {var}: {masked_value} - {description}")
            else:
                print(f"✓ {var}: 設定済み - {description}")
        else:
            print(f"✗ {var}: 未設定 - {description}")
            missing_required.append(var)
    
    # オプション環境変数のチェック
    print("\n[オプション環境変数]")
    for var, description in OPTIONAL_VARS.items():
        value = os.environ.get(var)
        if value:
            print(f"✓ {var}: 設定済み - {description}")
        else:
            print(f"△ {var}: 未設定 - {description}")
            missing_optional.append(var)
    
    # データベース接続情報の詳細
    db_url = os.environ.get('DATABASE_ROOT_URL', '')
    if db_url:
        print("\n[データベース接続情報]")
        if '127.0.0.1' in db_url or 'localhost' in db_url:
            print("⚠️  DATABASE_ROOT_URLに127.0.0.1/localhostが含まれています")
            print("   Docker環境では自動的にhost.docker.internalに変換されます")
    
    # 結果サマリー
    print("\n" + "=" * 60)
    if missing_required:
        print(f"❌ 必須環境変数が{len(missing_required)}個不足しています:")
        for var in missing_required:
            print(f"   - {var}")
        print("\n以下の内容を.envファイルに追加してください:")
        print("-" * 40)
        if 'OPENAI_API_KEY' in missing_required:
            print('OPENAI_API_KEY="sk-your-openai-api-key-here"')
        if 'SECRET_KEY' in missing_required:
            print('SECRET_KEY="django-insecure-your-secret-key-here"')
        if 'DATABASE_ROOT_URL' in missing_required:
            print('DATABASE_ROOT_URL="postgresql://user:password@host:5432/database"')
        print("-" * 40)
        return False
    else:
        print("✅ すべての必須環境変数が設定されています")
        if missing_optional:
            print(f"\nℹ️  オプション環境変数が{len(missing_optional)}個未設定です（動作には影響しません）")
        return True

def load_env_file(env_path):
    """手動で.envファイルを読み込む"""
    if not os.path.exists(env_path):
        return False
    
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                # クォートを除去
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                # 環境変数として設定（既存の値は上書きしない）
                if key not in os.environ:
                    os.environ[key] = value
    return True

def main():
    """メイン処理"""
    # .envファイルの読み込み
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_file):
        print(f".envファイルを読み込んでいます: {env_file}")
        load_env_file(env_file)
    else:
        print("⚠️  .envファイルが見つかりません")
    
    # チェック実行
    success = check_env()
    
    # 終了コード
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()