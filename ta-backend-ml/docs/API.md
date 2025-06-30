# API仕様書

このドキュメントでは、ta-backend-mlプロジェクトが提供するAPIエンドポイントについて説明します。

## 基本情報

- ベースURL: `http://localhost:8081/api`
- コンテンツタイプ: `application/json`
- 認証: 一部のAPIは`Authorization: Bearer <TOKEN>`ヘッダーによる認証が必要です

## エンドポイント一覧

### ヘルスチェック

#### GET /api/healthcheck

サーバーの状態を確認するためのヘルスチェックエンドポイントです。

**レスポンス:**

```json
{
  "code": "ok"
}
```

### Google Vertex AI Agent Builder 連携

#### POST /api/v1/dify/process_vertex_ai_agent_builder

Google Vertex AI Agent Builderを使用して検索・質問応答を行います。

**リクエスト:**

```json
{
  "q": "検索クエリまたは質問内容",
  "engine_id": "vertex-ai-エンジンID"
}
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "title": "検索結果タイトル",
        "snippet": "検索結果のスニペット",
        "uri": "https://example.com/result"
      }
    ],
    "metadata": {
      "query": "検索クエリ",
      "totalResults": 10
    }
  }
}
```

### URLスクレイピング

#### POST /api/v1/dify/process_url_scrape

指定されたURLのコンテンツをスクレイピングします。

**リクエスト:**

```json
{
  "url": "https://example.com/page"
}
```

**認証ヘッダー:**
```
Authorization: Bearer <TOKEN>
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "title": "ページタイトル",
    "description": "ページの説明",
    "language": "ja",
    "markdown_content": "# マークダウン形式のコンテンツ...",
    "links": [
      "https://example.com/link1",
      "https://example.com/link2"
    ],
    "metadata": {
      "statusCode": 200
    }
  }
}
```

### Webクローラー

#### POST /api/v1/dify/process_crawler

Webサイトのクローリングをキューに追加します。

**リクエスト:**

```json
{
  "url": "https://example.com"
}
```

**認証ヘッダー:**
```
Authorization: Bearer <TOKEN>
```

**レスポンス:**

```json
{
  "success": true,
  "message": "URL added to crawl queue",
  "data": {
    "url": "https://example.com",
    "status": "queued"
  }
}
```

### Geminiによるグラウンディング

#### POST /api/v1/dify/multimodal/process_gemini_grounding_google

Google Geminiを使用して画像や文書のグラウンディング処理を行います。

**リクエスト:**

```json
{
  "prompt": "分析のためのプロンプト",
  "image_base64": "画像のBase64エンコード文字列"
}
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "response": "Geminiからの応答テキスト"
  }
}
```

### ブラウザレンダリングとPDF変換

#### POST /api/v1/dify/process_render_browser_convert_pdf

WebページをレンダリングしてPDFに変換します。

**リクエスト:**

```json
{
  "url": "https://example.com/page",
  "options": {
    "format": "A4",
    "printBackground": true
  }
}
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "pdf_path": "/path/to/generated.pdf"
  }
}
```

### PDF処理

#### POST /api/v1/dify/multimodal/process_pdf_multiple_local

ローカルに保存されたPDFファイルを処理し、内容を分析します。

**リクエスト:**

```json
{
  "filepath": "/path/to/document.pdf",
  "type": "summary",
  "prompt": "分析のためのプロンプト",
  "name": "文書の名前"
}
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "page": 1,
        "content": "ページ1の分析結果"
      },
      {
        "page": 2,
        "content": "ページ2の分析結果"
      }
    ],
    "summary": "全体のサマリー"
  }
}
```

### ベクトルDB検索

#### POST /api/v1/dify/process_vector_db_search

ベクトルデータベースを使って情報検索を行います。

**リクエスト:**

```json
{
  "domain_name": "検索対象のドメイン",
  "query": "検索クエリ"
}
```

**認証ヘッダー:**
```
Authorization: Bearer <TOKEN>
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "text": "検索結果テキスト",
        "score": 0.95,
        "source": "https://example.com/source"
      }
    ],
    "metadata": {
      "domain_name": "検索対象のドメイン",
      "query": "検索クエリ",
      "total_results": 10
    }
  }
}
```

### ファイルアップロード

#### POST /api/v1/dify/upload

ファイルをサーバーにアップロードします。

**リクエストフォーム:**

```
Content-Type: multipart/form-data
file: [アップロードするファイル]
```

**レスポンス:**

```json
{
  "file_path": "/app/project/app/output/abc123.pdf"
}
```

## エラーレスポンス

API呼び出しが失敗した場合、以下の形式でエラーレスポンスが返されます：

```json
{
  "success": false,
  "message": "エラーの詳細メッセージ",
  "data": {
    "metadata": {
      "statusCode": 400,
      "error": "エラーコード"
    }
  }
}
```

または

```json
{
  "error": "エラーの詳細メッセージ"
}
``` 
