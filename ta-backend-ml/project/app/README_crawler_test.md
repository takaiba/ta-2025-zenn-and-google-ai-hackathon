# Knowledge Crawler テスト・ドキュメント

このディレクトリには、Knowledge Crawlerのクローリング範囲を検証するためのテストファイルと詳細ドキュメントが含まれています。

## ファイル構成

- `test_crawler_range.py` - クローリング範囲決定ロジックのテストファイル
- `../docs/crawler-scope-documentation.md` - クローリング範囲の詳細ドキュメント

## テストファイルの実行方法

### 基本実行

```bash
cd project/app
python test_crawler_range.py
```

### 実行結果の例

```
================================================================================
Knowledge Crawler クローリング範囲テストシナリオ
================================================================================

重要な制約:
1. 同一オリジン（scheme + netloc）である必要がある
2. かつ（現在のディレクトリ配下 OR pathPatternsに一致）である必要がある
3. pathPatternsによる拡張も同一オリジン内でのみ有効

【基本的なドキュメントサイト（同一オリジン制約あり）】
開始URL: https://example.com/docs/
pathPatterns: ['example.com/docs/*', 'example.com/knowledge/*']

✓ クローリング可能:
  - https://example.com/docs/api.html （ディレクトリ配下）
  - https://example.com/docs/guide/intro.html （サブディレクトリ）
  - https://example.com/knowledge/faq.html （pathPattern一致、同一オリジン）

✗ クローリング不可:
  - https://example.com/blog/post1.html （pattern外）
  - https://help.example.com/faq.html （異なるサブドメイン）
  - https://other-site.com/docs/api.html （異なるドメイン）
  - http://example.com/docs/api.html （異なるスキーム）

... (続く)

----------------------------------------------------------------------
Ran 10 tests in 0.001s

OK
```

## テストの内容

### 1. pathPatternsマッチングテスト (`TestPathPatterns`)

- 基本的なワイルドカードパターンマッチング
- 複雑なパターンの組み合わせ
- サブドメインワイルドカードの動作

### 2. クローリング範囲決定テスト (`TestCrawlingRange`)

- ディレクトリベースのクローリング
- pathPatternベースのクローリング（同一オリジン内）
- ドメイン間制限
- ファイルとディレクトリの処理
- クエリパラメータとフラグメントの処理

### 3. 具体的なシナリオテスト (`TestSpecificScenarios`)

- ドキュメントサイトのシナリオ
- サブドメインから開始するシナリオ
- 同一オリジン内でのpathPattern拡張

## 主要な検証ポイント

### ✅ 確認済み動作

1. **同一オリジン制約の厳格な適用**
   - スキーム、ホスト名、ポートが完全一致する必要がある
   - 異なるサブドメインは同一オリジンとみなされない

2. **ディレクトリベースクローリング**
   - 現在のページのディレクトリ配下は自動的にクローリング対象
   - 上位ディレクトリへの遷移は制限される

3. **pathPatternによる拡張**
   - 同一オリジン内でのみ有効
   - ワイルドカード（`*`, `?`）の正しい動作

4. **URL正規化**
   - クエリパラメータとフラグメントの除去
   - 相対URLの絶対URL変換

### ❌ 制限事項

1. **クロスオリジンアクセス不可**
   - 異なるサブドメイン間の遷移不可
   - HTTP ↔ HTTPS間の遷移不可
   - 異なるポート間の遷移不可

2. **pathPatternの制限**
   - 同一オリジン制約の範囲内でのみ動作
   - ワイルドカードパターンでも他のオリジンにはアクセス不可

## カスタムテストの追加方法

新しいテストケースを追加したい場合：

```python
def test_custom_scenario(self):
    """カスタムシナリオのテスト"""
    current_url = "https://example.com/custom/"
    depth_zero_url = "https://example.com/custom/"
    patterns = ["example.com/custom/*"]
    
    # テストケース
    can_crawl, reason = is_crawlable(
        current_url=current_url,
        target_url="page.html",
        depth_zero_url=depth_zero_url,
        path_patterns=patterns
    )
    self.assertTrue(can_crawl, f"理由: {reason}")
```

## ドキュメント参照

詳細な仕様とより多くの具体例については、以下のドキュメントを参照してください：

- `../docs/crawler-scope-documentation.md` - 完全な仕様とケーススタディ

## 関数の個別テスト

### `matches_path_patterns()` 関数のテスト

```python
from test_crawler_range import matches_path_patterns

# 基本テスト
result = matches_path_patterns(
    url="https://example.com/docs/api.html",
    path_patterns=["example.com/docs/*"]
)
print(result)  # True
```

### `is_crawlable()` 関数のテスト

```python
from test_crawler_range import is_crawlable

# 基本テスト
can_crawl, reason = is_crawlable(
    current_url="https://example.com/docs/",
    target_url="api.html",
    depth_zero_url="https://example.com/docs/"
)
print(f"可能: {can_crawl}, 理由: {reason}")
```

## トラブルシューティング

### テストが失敗する場合

1. **Pythonパスの確認**
   ```bash
   export PYTHONPATH="${PYTHONPATH}:$(pwd)"
   ```

2. **依存関係の確認**
   - `urllib.parse` (標準ライブラリ)
   - `fnmatch` (標準ライブラリ)
   - `unittest` (標準ライブラリ)

3. **権限の確認**
   - ファイルの読み取り権限があるかチェック

### 新しいシナリオを検証したい場合

1. 実際の認証設定をJSON形式で用意
2. 期待する動作をテストケースとして記述
3. `test_crawler_range.py` に追加
4. テスト実行で動作を確認

## 参考情報

- 実装ファイル: `knowledge_crawler.py`
- 主要関数: `matches_path_patterns()`, `process_single_url()`
- 設定形式: `knowledgetool.authInfo` (JSON) 
