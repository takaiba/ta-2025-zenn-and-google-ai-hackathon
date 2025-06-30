# 技術スタック

## バックエンド

### 言語
- Python 3.9

### フレームワーク
- Django 4.2.5

### データベース
- PostgreSQL (Prisma ORM経由でアクセス)

### ORM
- Prisma Client Python (0.15.0)

### API関連
- requests 2.31.0
- google-api-python-client
- google-api-core 2.11.1

### AI/ML関連
- google-cloud-aiplatform 1.63.0
- google-cloud-discoveryengine 0.13.4
- google-genai 0.2.2 (Gemini API)
- anthropic 0.40.0 (Claude API)
- openai 1.56.1
- tiktoken 0.4.0
- transformers 4.45以上

### ドキュメント処理
- PyPDF2 3.0.1
- pdf2image 1.17.0
- python-docx
- pdfkit
- beautifulsoup4 4.12.3
- bs4 0.0.1
- lxml 5.3.0
- markdownify 0.14.1

### 画像処理
- pillow 11.0.0
- moviepy 1.0.3 (動画処理)

### 自然言語処理
- janome 0.4.2 (日本語形態素解析)

### モニタリング/ロギング
- sentry-sdk[django] 1.29.2
- memory_profiler 0.61.0

### 開発ツール
- pip-review 1.3.0
- ruff (リンター)
- mypy (静的型チェッカー)

## インフラストラクチャ

### コンテナ化
- Docker
- Docker Compose

### CI/CD
- GitHub Actions

### Kubernetes関連
- k8sディレクトリに設定ファイルあり

## 開発環境
- pre-commit フック
- venv (Python仮想環境)

## 依存関係管理
- pip (requirements.txt, requirements-dev.txt) 
