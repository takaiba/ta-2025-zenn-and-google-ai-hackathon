# ディレクトリ構成

```
.
├── .cursor/              # Cursor IDE関連ファイル
├── .git/                 # Gitリポジトリ
├── .github/              # GitHub関連設定（CI/CDなど）
├── .mypy_cache/          # mypy型チェッカーのキャッシュ
├── .ruff_cache/          # Ruffリンターのキャッシュ
├── __pycache__/          # Pythonキャッシュファイル
├── adhoc-batch/          # アドホックバッチ処理スクリプト
├── audio_for_dialize.mp3/ # 音声ファイル
├── audio_for_dialize.wav/ # 音声ファイル
├── coverage/             # コードカバレッジレポート
├── dify-yml-archive/     # DIFYのYAML設定アーカイブ
├── docs/                 # ドキュメント
│   ├── ARCHITECTURE.md   # アーキテクチャ説明
│   ├── directory.md      # ディレクトリ構成（このファイル）
│   ├── images/           # ドキュメント用画像
│   └── technology-stack.md # 技術スタック
├── env/                  # 環境関連
├── k8s/                  # Kubernetes設定
├── output/               # 出力ファイル
├── project/              # メインプロジェクトディレクトリ
│   ├── app/              # アプリケーションコード
│   │   ├── __init__.py 
│   │   ├── __pycache__/
│   │   ├── admin.py      # Django管理画面設定
│   │   ├── apps.py       # Djangoアプリ設定
│   │   ├── management/   # カスタム管理コマンド
│   │   ├── migrations/   # データベースマイグレーション
│   │   ├── models.py     # データモデル定義
│   │   ├── output/       # アプリケーション出力
│   │   ├── process_*.py  # 各種処理ファイル
│   │   ├── process_*.yaml # 処理設定ファイル
│   │   ├── process_*.sh  # 処理実行スクリプト
│   │   ├── tests.py      # テストコード
│   │   ├── urls.py       # URLルーティング
│   │   ├── utils.py      # ユーティリティ関数
│   │   ├── utils_*.py    # 特定の機能向けユーティリティ
│   │   └── views.py      # ビュー関数
│   ├── batch/            # バッチ処理
│   ├── db.sqlite3        # SQLiteデータベース（開発用）
│   ├── manage.py         # Djangoコマンドラインツール
│   ├── output/           # 出力ディレクトリ
│   └── project/          # Djangoプロジェクト設定
│       ├── __init__.py
│       ├── settings.py   # Django設定
│       ├── urls.py       # プロジェクトレベルURL設定
│       └── wsgi.py       # WSGIアプリケーション
├── venv/                 # Python仮想環境
├── _typos.toml           # typosの設定
├── .dockerignore         # Dockerビルド除外設定
├── .env                  # 環境変数設定
├── .env.example          # 環境変数設定例
├── .gitignore            # Git除外設定
├── .pre-commit-config.yaml # pre-commitフック設定
├── CONTRIBUTING.md       # 貢献ガイドライン
├── Dockerfile            # Dockerビルド設定
├── Makefile              # タスク自動化スクリプト
├── README.md             # プロジェクト概要
├── conftest.py           # Pytestの共通設定
├── crawler.py            # クローラースクリプト
├── dify.py               # DIFYインテグレーション
├── docker-compose.yml    # Docker Compose設定
├── gemini.py             # Gemini API関連スクリプト
├── json_utils.py         # JSONユーティリティ
├── mypy.ini              # mypy設定
├── output.log            # ログ出力
├── prisma_schema_cleanup.py # Prismaスキーマクリーンアップスクリプト
├── prompt.md             # プロンプトテンプレート
├── requirements-dev.txt  # 開発用依存関係
├── requirements.txt      # 本番用依存関係
├── ruff.toml             # Ruff設定
├── schema.prisma         # Prismaデータベーススキーマ
└── test.py               # テストスクリプト
```

## 主要ディレクトリの説明

### project/

Djangoプロジェクトのルートディレクトリです。メインのアプリケーションコードが含まれています。

#### project/app/

アプリケーションの主要なコードが含まれています。各種処理モジュール、ビュー、URL設定などがあります。

- **process_*.py** - 各種処理を行うPythonモジュール（例：ベクトルDB検索、PDF処理など）
- **process_*.yaml** - 処理の設定ファイル
- **utils_*.py** - 特定の機能のためのユーティリティ関数

### docs/

プロジェクトのドキュメント類が含まれています。

### k8s/

Kubernetes関連の設定ファイルが含まれています。

### output/

処理結果の出力先ディレクトリです。

### adhoc-batch/

アドホックなバッチ処理のためのスクリプトが含まれています。 
