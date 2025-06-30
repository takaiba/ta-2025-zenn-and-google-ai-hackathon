# Knowledge Crawler クローリング範囲ドキュメント

## 概要

Knowledge Crawlerは、指定された認証設定に基づいてWebサイトを自動的にクローリングします。このドキュメントでは、具体的にどの範囲までクローリングが可能で、どこまでは不可能かを詳細に説明します。

## クローリング範囲の決定ルール

### 基本的な制約

1. **同一オリジン制約（最重要）**
   - クローリング対象は開始URL（depth_zero_url）と同じオリジン（スキーム + ホスト名）である必要があります
   - 異なるサブドメイン、異なるポート、異なるスキームへの遷移は不可能です

2. **ディレクトリ制約またはpathPattern制約**
   - 現在のページのディレクトリ配下のページ、または
   - pathPatternsに一致するページ（同一オリジン内）
   
3. **深度制約**
   - maxDepthで指定された最大深度まで

### 判定ロジック

```
クローリング可能 = 同一オリジン AND (ディレクトリ配下 OR pathPattern一致) AND 深度以内
```

## 具体的なクローリング範囲例

### 1. 基本的なドキュメントサイトの例

**設定:**
```json
{
  "urls": ["https://example.com/docs/"],
  "maxDepth": 3,
  "pathPatterns": ["example.com/docs/*", "example.com/knowledge/*"]
}
```

**✓ クローリング可能:**

1. **ディレクトリ配下のページ**
   - `https://example.com/docs/api.html`
   - `https://example.com/docs/getting-started.html`
   - `https://example.com/docs/guide/intro.html`
   - `https://example.com/docs/guide/advanced/config.html`
   - `https://example.com/docs/tutorials/tutorial1.html`
   - `https://example.com/docs/examples/sample1.json`

2. **pathPatternに一致するページ（同一オリジン内）**
   - `https://example.com/knowledge/faq.html`
   - `https://example.com/knowledge/troubleshooting.html`
   - `https://example.com/knowledge/howto/setup.html`

3. **クエリパラメータやフラグメント付きURL**
   - `https://example.com/docs/api.html?version=v1`
   - `https://example.com/docs/guide.html#section1`
   - `https://example.com/knowledge/search?q=help`

**✗ クローリング不可:**

1. **pathPatternに一致しない同一オリジンのページ**
   - `https://example.com/blog/post1.html`
   - `https://example.com/admin/dashboard.html`
   - `https://example.com/users/profile.html`
   - `https://example.com/shop/products.html`

2. **異なるサブドメインのページ**
   - `https://help.example.com/faq.html`
   - `https://api.example.com/v1/users`
   - `https://blog.example.com/post1.html`
   - `https://support.example.com/tickets`

3. **異なるドメインのページ**
   - `https://other-site.com/docs/api.html`
   - `https://google.com/search?q=example`
   - `https://github.com/example/repo`

4. **異なるスキームのページ**
   - `http://example.com/docs/api.html` （httpsから開始した場合）
   - `ftp://example.com/files/`
   - `mailto:support@example.com`

5. **異なるポートのページ**
   - `https://example.com:8080/docs/api.html`
   - `https://example.com:3000/dev/`

### 2. サブドメインから開始する例

**設定:**
```json
{
  "urls": ["https://docs.example.com/"],
  "maxDepth": 2,
  "pathPatterns": ["docs.example.com/*", "*.example.com/api/*"]
}
```

**✓ クローリング可能:**

1. **同一サブドメイン内のページ**
   - `https://docs.example.com/guide/intro.html`
   - `https://docs.example.com/api/reference.html`
   - `https://docs.example.com/tutorials/getting-started.html`
   - `https://docs.example.com/examples/sample.json`

**✗ クローリング不可:**

1. **他のサブドメイン（pathPatternに一致していても）**
   - `https://api.example.com/v1/users` （pathPattern `*.example.com/api/*` に一致するが異なるオリジン）
   - `https://blog.example.com/post1.html`
   - `https://help.example.com/support.html`

2. **メインドメイン**
   - `https://example.com/`
   - `https://example.com/docs/` （サブドメインではない）

### 3. 複雑なpathPattern設定の例

**設定:**
```json
{
  "urls": ["https://shop.com/products/"],
  "maxDepth": 4,
  "pathPatterns": [
    "shop.com/products/*",
    "shop.com/categories/*",
    "shop.com/search*",
    "shop.com/reviews/*",
    "shop.com/compare*"
  ]
}
```

**✓ クローリング可能:**

1. **ディレクトリ配下のページ**
   - `https://shop.com/products/laptop/macbook-pro.html`
   - `https://shop.com/products/phone/iphone.html`
   - `https://shop.com/products/search?category=electronics`
   - `https://shop.com/products/details/12345`

2. **pathPatternに一致するページ**
   - `https://shop.com/categories/electronics.html`
   - `https://shop.com/categories/clothing/mens.html`
   - `https://shop.com/search?q=laptop`
   - `https://shop.com/search/advanced`
   - `https://shop.com/reviews/product/12345`
   - `https://shop.com/compare?item1=123&item2=456`

**✗ クローリング不可:**

1. **pathPatternに一致しないページ**
   - `https://shop.com/admin/dashboard.html`
   - `https://shop.com/users/login.html`
   - `https://shop.com/cart/checkout.html`
   - `https://shop.com/orders/history.html`
   - `https://shop.com/support/contact.html`

2. **異なるサブドメイン**
   - `https://api.shop.com/v1/products`
   - `https://admin.shop.com/dashboard`
   - `https://cdn.shop.com/images/logo.png`

### 4. ワイルドカードパターンの例

**設定:**
```json
{
  "urls": ["https://company.com/docs/"],
  "maxDepth": 3,
  "pathPatterns": [
    "company.com/docs/*",
    "company.com/*/help/*",
    "company.com/download/*"
  ]
}
```

**✓ クローリング可能:**

1. **基本的なdocs配下**
   - `https://company.com/docs/api.html`
   - `https://company.com/docs/guide/intro.html`

2. **ワイルドカードに一致するページ**
   - `https://company.com/products/help/installation.html`
   - `https://company.com/services/help/troubleshooting.html`
   - `https://company.com/download/software.zip`
   - `https://company.com/download/manual.pdf`

**✗ クローリング不可:**

1. **ワイルドカードに一致しないページ**
   - `https://company.com/products/list.html` （help配下ではない）
   - `https://company.com/about/team.html`
   - `https://company.com/contact/form.html`

### 5. 深いディレクトリ構造の例

**設定:**
```json
{
  "urls": ["https://api.example.com/v1/"],
  "maxDepth": 5,
  "pathPatterns": ["api.example.com/v1/*", "api.example.com/docs/*"]
}
```

**✓ クローリング可能:**

1. **v1配下の深いパス**
   - `https://api.example.com/v1/users`
   - `https://api.example.com/v1/users/123`
   - `https://api.example.com/v1/users/123/profile`
   - `https://api.example.com/v1/orders/456/items/789`
   - `https://api.example.com/v1/admin/reports/daily/2024/01/15`

2. **pathPatternに一致するdocs**
   - `https://api.example.com/docs/openapi.yaml`
   - `https://api.example.com/docs/authentication.html`

**✗ クローリング不可:**

1. **v2など異なるバージョン**
   - `https://api.example.com/v2/users`
   - `https://api.example.com/beta/features`

### 6. ファイル拡張子による制限例

**現在のページ:** `https://docs.example.com/guide/intro.html`
**開始URL:** `https://docs.example.com/`

**✓ クローリング可能:**

1. **同じディレクトリ内のファイル**
   - `https://docs.example.com/guide/advanced.html`
   - `https://docs.example.com/guide/config.json`
   - `https://docs.example.com/guide/examples.yaml`

2. **サブディレクトリ**
   - `https://docs.example.com/guide/examples/sample1.html`
   - `https://docs.example.com/guide/images/diagram.png`

**✗ クローリング不可:**

1. **上位ディレクトリへの移動**
   - `https://docs.example.com/` （現在のディレクトリより上位）
   - `https://docs.example.com/api/` （親ディレクトリの兄弟ディレクトリ）

### 7. リアルタイム制約の例

**制約条件:**
- 同じdomainPathのエントリは最大10件まで
- 1週間以内にクロールされたURLはスキップ
- maxDepthによる深度制限

**例:** `https://news.example.com/articles/`から開始

**✓ クローリング可能（条件満たす場合）:**
- `https://news.example.com/articles/2024/01/15/news1.html`
- `https://news.example.com/articles/2024/01/16/news2.html`
- ...（最大10件まで、かつ1週間以内にクロールされていない場合）

**✗ クローリング不可（制限に引っかかる場合）:**
- 11件目以降の同じdomainPath（`news.example.com/articles/`）のエントリ
- 1週間以内にクロールされたURL
- maxDepthを超えるURL

## pathPatternsの詳細仕様

### ワイルドカード記法

1. **`*` - 任意の文字列にマッチ**
   - `example.com/docs/*` → `example.com/docs/api.html` ✓
   - `example.com/docs/*` → `example.com/docs/guide/intro.html` ✓

2. **`*.example.com` - サブドメインワイルドカード**
   - `*.example.com/api/*` → `api.example.com/api/v1/users` ✓
   - `*.example.com/api/*` → `docs.example.com/api/reference` ✓

3. **`?` - 単一文字にマッチ**
   - `example.com/page?.html` → `example.com/page1.html` ✓
   - `example.com/page?.html` → `example.com/page10.html` ✗

### パターンマッチングの注意点

1. **スキームは含まない**
   - パターン: `example.com/docs/*`
   - マッチ対象: `example.com/docs/api.html` （スキーム除去後）

2. **大文字小文字の区別**
   - パターンは大文字小文字を区別します
   - `Example.com` と `example.com` は異なる

3. **パスの末尾スラッシュ**
   - `example.com/docs/` と `example.com/docs` は区別される

## よくある誤解と注意点

### ❌ 誤解1: pathPatternがあれば異なるサブドメインにもアクセス可能

**間違った理解:**
```json
{
  "urls": ["https://example.com/docs/"],
  "pathPatterns": ["*.example.com/*"]
}
```
「この設定で `https://api.example.com/` にアクセスできる」

**正しい理解:**
同一オリジン制約により、`https://example.com/` から開始した場合、`https://api.example.com/` には**アクセスできません**。

### ❌ 誤解2: HTTPからHTTPSへの自動遷移

**間違った理解:**
`http://example.com/` から開始して `https://example.com/` にアクセスできる

**正しい理解:**
スキームが異なるため**アクセスできません**。

### ❌ 誤解3: pathPatternによる無制限な範囲拡張

**間違った理解:**
```json
{
  "pathPatterns": ["*"]
}
```
「この設定ですべてのサイトにアクセスできる」

**正しい理解:**
同一オリジン制約があるため、開始URLと同じオリジン内でのみ有効です。

## 推奨設定パターン

### 1. ドキュメントサイト用設定

```json
{
  "urls": ["https://docs.example.com/"],
  "maxDepth": 5,
  "pathPatterns": [
    "docs.example.com/*",
    "docs.example.com/api/*",
    "docs.example.com/guides/*",
    "docs.example.com/tutorials/*"
  ]
}
```

### 2. 企業サイト用設定

```json
{
  "urls": ["https://company.com/"],
  "maxDepth": 4,
  "pathPatterns": [
    "company.com/products/*",
    "company.com/services/*",
    "company.com/support/*",
    "company.com/docs/*"
  ]
}
```

### 3. ECサイト用設定

```json
{
  "urls": ["https://shop.com/"],
  "maxDepth": 6,
  "pathPatterns": [
    "shop.com/products/*",
    "shop.com/categories/*",
    "shop.com/search*",
    "shop.com/reviews/*"
  ]
}
```

## トラブルシューティング

### 問題: 期待したページがクローリングされない

**確認ポイント:**

1. **同一オリジン制約**
   - 開始URLと対象URLのスキーム・ホスト名が一致しているか？

2. **pathPattern設定**
   - pathPatternsに対象URLが含まれているか？
   - ワイルドカードが正しく設定されているか？

3. **ディレクトリ制約**
   - 対象URLが現在のページのディレクトリ配下にあるか？

4. **深度制限**
   - maxDepthを超えていないか？

### 問題: 意図しないページがクローリングされる

**確認ポイント:**

1. **pathPatternが広すぎる**
   - `*` だけのパターンは避ける
   - より具体的なパターンを設定する

2. **ディレクトリの範囲**
   - 開始URLのディレクトリ設定を見直す

## まとめ

Knowledge Crawlerのクローリング範囲は以下の3つの制約によって厳格に制限されています：

1. **同一オリジン制約**（最も重要）
2. **ディレクトリまたはpathPattern制約**
3. **深度制約**

特に同一オリジン制約は非常に厳しく、異なるサブドメインや異なるスキーム、異なるポートへの遷移は一切許可されません。この制約を理解することが、効果的なクローリング設定を行う上で最も重要です。 
