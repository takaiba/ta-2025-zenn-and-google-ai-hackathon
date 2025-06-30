#!/usr/bin/env python3
"""
Knowledge Crawler の範囲決定ロジックのテストファイル

このファイルでは、クローリング範囲を決定する各種ロジックを
具体的なケースでテストし、動作を検証します。

重要な制約:
1. 同一オリジン（scheme + netloc）である必要がある
2. かつ（現在のディレクトリ配下 OR pathPatternsに一致）である必要がある
3. pathPatternsによる拡張も同一オリジン内でのみ有効
"""

import unittest
from urllib.parse import urlparse, urljoin, urlunparse
import fnmatch
from typing import List


def matches_path_patterns(url: str, path_patterns: List[str]) -> bool:
    """
    URLがpathPatternsのいずれかに一致するかチェック
    (knowledge_crawler.pyの関数をコピー)
    """
    if not path_patterns:
        return False
    
    parsed_url = urlparse(url)
    # スキームを除いたホスト名＋パス部分を取得
    url_without_scheme = f"{parsed_url.netloc}{parsed_url.path}"
    
    for pattern in path_patterns:
        if fnmatch.fnmatch(url_without_scheme, pattern):
            return True
    
    return False


def is_crawlable(current_url: str, target_url: str, depth_zero_url: str, path_patterns: List[str] = None) -> tuple[bool, str]:
    """
    クローリング可能かどうかを判定する関数
    
    Args:
        current_url: 現在のページURL
        target_url: 判定対象のURL
        depth_zero_url: 開始URL（同一オリジン制約の基準）
        path_patterns: pathPatternsリスト
    
    Returns:
        (クローリング可能か, 理由)
    """
    # 1. 現在のURLのディレクトリパスを取得
    parsed_current_url = urlparse(current_url)
    current_path = parsed_current_url.path
    
    # current_path がファイル名を指している場合、ディレクトリ部分を取得
    path_segments = [segment for segment in current_path.split('/') if segment]
    if not current_path.endswith('/') and len(path_segments) > 0:
        current_dir_path_only = '/' + '/'.join(path_segments[:-1])
        if not current_dir_path_only.endswith('/'):
            current_dir_path_only += '/'
    elif current_path.endswith('/'):
        current_dir_path_only = current_path
    else:  # ルートパスでファイル名のみの場合など
        current_dir_path_only = '/'

    # current_dir_path_only が "//" で始まる場合、 "/" に修正
    if current_dir_path_only.startswith('//'):
        current_dir_path_only = current_dir_path_only[1:]

    current_directory_prefix = f"{parsed_current_url.scheme}://{parsed_current_url.netloc}{current_dir_path_only}"
    # current_directory_prefix の末尾が // になるケースを修正
    if current_directory_prefix.endswith('//') and len(urlparse(current_directory_prefix).path) > 1:
        current_directory_prefix = current_directory_prefix[:-1]

    # 2. target_urlを正規化
    full_url = urljoin(current_url, target_url)
    parsed_full_url = urlparse(full_url)
    # クエリパラメータとフラグメントを削除
    clean_url = urlunparse(parsed_full_url._replace(query="", fragment=""))
    
    # 3. depth_zero_urlと同じオリジンかチェック（重要な制約）
    parsed_depth_zero_url = urlparse(depth_zero_url)
    is_same_origin_as_depth_zero = (parsed_full_url.scheme == parsed_depth_zero_url.scheme and
                                    parsed_full_url.netloc == parsed_depth_zero_url.netloc)
    
    if not is_same_origin_as_depth_zero:
        return False, f"異なるオリジン: {parsed_full_url.scheme}://{parsed_full_url.netloc} vs {parsed_depth_zero_url.scheme}://{parsed_depth_zero_url.netloc}"
    
    # 4. 現在のディレクトリ配下かチェック
    is_under_current_directory = clean_url.startswith(current_directory_prefix)
    
    # 5. pathPatternsに一致するかチェック（同一オリジン内でのみ）
    matches_patterns = matches_path_patterns(clean_url, path_patterns or [])
    
    # 6. 最終判定（同一オリジン内で、ディレクトリ配下またはpathPattern一致）
    if is_under_current_directory:
        return True, f"現在のディレクトリ配下: {current_directory_prefix}"
    elif matches_patterns:
        return True, f"pathPatternに一致（同一オリジン内）: {path_patterns}"
    else:
        return False, f"現在のディレクトリ配下でもpathPatternにも一致しない (current_dir: {current_directory_prefix}, patterns: {path_patterns})"


class TestPathPatterns(unittest.TestCase):
    """pathPatternsのマッチングテスト"""
    
    def test_basic_matching(self):
        """基本的なパターンマッチングのテスト"""
        # 完全一致
        self.assertTrue(matches_path_patterns(
            "https://example.com/docs/api.html",
            ["example.com/docs/api.html"]
        ))
        
        # ワイルドカード一致
        self.assertTrue(matches_path_patterns(
            "https://example.com/docs/api.html",
            ["example.com/docs/*"]
        ))
        
        # サブドメインのワイルドカード
        self.assertTrue(matches_path_patterns(
            "https://api.example.com/v1/docs.html",
            ["*.example.com/v1/*"]
        ))
        
        # 一致しない場合
        self.assertFalse(matches_path_patterns(
            "https://other.com/docs/api.html",
            ["example.com/docs/*"]
        ))
    
    def test_complex_patterns(self):
        """複雑なパターンのテスト"""
        patterns = [
            "example.com/docs/*",
            "*.example.com/api/*",
            "help.example.com/knowledge/*"
        ]
        
        # docs配下
        self.assertTrue(matches_path_patterns(
            "https://example.com/docs/getting-started.html",
            patterns
        ))
        
        # api配下（サブドメイン）
        self.assertTrue(matches_path_patterns(
            "https://v1.example.com/api/users.json",
            patterns
        ))
        
        # knowledge配下（特定サブドメイン）
        self.assertTrue(matches_path_patterns(
            "https://help.example.com/knowledge/faq.html",
            patterns
        ))
        
        # 一致しない
        self.assertFalse(matches_path_patterns(
            "https://example.com/blog/post1.html",
            patterns
        ))


class TestCrawlingRange(unittest.TestCase):
    """クローリング範囲決定のテスト"""
    
    def test_directory_based_crawling(self):
        """ディレクトリベースのクローリングテスト"""
        # 基本的なディレクトリ配下のクローリング
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="api.html",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertTrue(can_crawl, f"理由: {reason}")
        
        # サブディレクトリ
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="guide/intro.html",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertTrue(can_crawl, f"理由: {reason}")
        
        # ディレクトリ外（失敗ケース）
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="../blog/post1.html",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertFalse(can_crawl, f"理由: {reason}")
    
    def test_pattern_based_crawling(self):
        """pathPatternベースのクローリングテスト（同一オリジン内）"""
        patterns = ["example.com/knowledge/*", "example.com/api/*"]
        
        # pathPatternに一致（同一オリジン内のディレクトリ外）
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="../knowledge/faq.html",
            depth_zero_url="https://example.com/docs/",
            path_patterns=patterns
        )
        self.assertTrue(can_crawl, f"理由: {reason}")
        
        # 異なるサブドメインのpathPattern（失敗 - 同一オリジン制約により）
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="https://api.example.com/api/v1/users",
            depth_zero_url="https://example.com/docs/",
            path_patterns=["*.example.com/api/*"]
        )
        self.assertFalse(can_crawl, f"理由: {reason}")
        
        # pathPatternに一致しない
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="../blog/post1.html",
            depth_zero_url="https://example.com/docs/",
            path_patterns=patterns
        )
        self.assertFalse(can_crawl, f"理由: {reason}")
    
    def test_cross_domain_restrictions(self):
        """ドメイン間制限のテスト"""
        # 異なるドメイン（失敗）
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="https://other-site.com/docs/",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertFalse(can_crawl, f"理由: {reason}")
        
        # 異なるスキーム（失敗）
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="http://example.com/docs/api.html",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertFalse(can_crawl, f"理由: {reason}")
        
        # 異なるポート（失敗）
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="https://example.com:8080/docs/api.html",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertFalse(can_crawl, f"理由: {reason}")
    
    def test_file_vs_directory_handling(self):
        """ファイルとディレクトリの処理テスト"""
        # ファイルから同ディレクトリ内のファイル
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/index.html",
            target_url="api.html",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertTrue(can_crawl, f"理由: {reason}")
        
        # ファイルからサブディレクトリ
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/index.html",
            target_url="guide/intro.html",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertTrue(can_crawl, f"理由: {reason}")
        
        # ファイルから上位ディレクトリ（ディレクトリ制限により失敗）
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/guide/intro.html",
            target_url="../../blog/post1.html",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertFalse(can_crawl, f"理由: {reason}")
    
    def test_query_and_fragment_handling(self):
        """クエリパラメータとフラグメントの処理テスト"""
        # クエリパラメータ付きURL
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="api.html?version=v1&format=json",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertTrue(can_crawl, f"理由: {reason}")
        
        # フラグメント付きURL
        can_crawl, reason = is_crawlable(
            current_url="https://example.com/docs/",
            target_url="api.html#section1",
            depth_zero_url="https://example.com/docs/"
        )
        self.assertTrue(can_crawl, f"理由: {reason}")


class TestSpecificScenarios(unittest.TestCase):
    """具体的なシナリオのテスト"""
    
    def test_documentation_site_scenario(self):
        """ドキュメントサイトのシナリオ（同一オリジン制約あり）"""
        # 設定: example.com/docs/ からスタート
        current_url = "https://example.com/docs/"
        depth_zero_url = "https://example.com/docs/"
        patterns = ["example.com/docs/*", "example.com/knowledge/*"]
        
        # ✓ 可能: docs配下のファイル（ディレクトリ配下）
        self.assertTrue(is_crawlable(current_url, "getting-started.html", depth_zero_url, patterns)[0])
        self.assertTrue(is_crawlable(current_url, "api/index.html", depth_zero_url, patterns)[0])
        self.assertTrue(is_crawlable(current_url, "tutorials/tutorial1.html", depth_zero_url, patterns)[0])
        
        # ✓ 可能: pathPatternに一致（同一オリジン内）
        self.assertTrue(is_crawlable(current_url, "../knowledge/faq.html", depth_zero_url, patterns)[0])
        
        # ✗ 不可: blog配下（ディレクトリ外かつpattern外）
        self.assertFalse(is_crawlable(current_url, "../blog/post1.html", depth_zero_url, patterns)[0])
        
        # ✗ 不可: 異なるドメイン
        self.assertFalse(is_crawlable(current_url, "https://other-site.com/docs/", depth_zero_url, patterns)[0])
        
        # ✗ 不可: 異なるサブドメイン（同一オリジン制約により）
        self.assertFalse(is_crawlable(current_url, "https://help.example.com/faq.html", depth_zero_url, patterns)[0])
    
    def test_subdomain_start_scenario(self):
        """サブドメインから開始するシナリオ"""
        # 設定: docs.example.com/ からスタート
        current_url = "https://docs.example.com/"
        depth_zero_url = "https://docs.example.com/"
        patterns = ["docs.example.com/*", "*.example.com/api/*"]
        
        # ✓ 可能: 同じサブドメイン内（ディレクトリ配下）
        self.assertTrue(is_crawlable(current_url, "guide/intro.html", depth_zero_url, patterns)[0])
        self.assertTrue(is_crawlable(current_url, "api/reference.html", depth_zero_url, patterns)[0])
        
        # ✗ 不可: 他のサブドメイン（同一オリジン制約により）
        self.assertFalse(is_crawlable(current_url, "https://api.example.com/v1/", depth_zero_url, patterns)[0])
        self.assertFalse(is_crawlable(current_url, "https://blog.example.com/post1.html", depth_zero_url, patterns)[0])
        
        # ✗ 不可: メインドメイン（同一オリジン制約により）
        self.assertFalse(is_crawlable(current_url, "https://example.com/", depth_zero_url, patterns)[0])
    
    def test_same_origin_pattern_expansion(self):
        """同一オリジン内でのpathPattern拡張テスト"""
        # 設定: example.com/products/ からスタート
        current_url = "https://example.com/products/"
        depth_zero_url = "https://example.com/products/"
        patterns = ["example.com/products/*", "example.com/categories/*", "example.com/search*"]
        
        # ✓ 可能: products配下（ディレクトリ配下）
        self.assertTrue(is_crawlable(current_url, "laptop/macbook-pro.html", depth_zero_url, patterns)[0])
        self.assertTrue(is_crawlable(current_url, "search?q=laptop", depth_zero_url, patterns)[0])
        
        # ✓ 可能: pathPatternに一致（同一オリジン内）
        self.assertTrue(is_crawlable(current_url, "../categories/electronics.html", depth_zero_url, patterns)[0])
        self.assertTrue(is_crawlable(current_url, "../search?q=phone", depth_zero_url, patterns)[0])
        
        # ✗ 不可: pattern外
        self.assertFalse(is_crawlable(current_url, "../admin/dashboard.html", depth_zero_url, patterns)[0])
        self.assertFalse(is_crawlable(current_url, "../users/profile.html", depth_zero_url, patterns)[0])


def print_test_scenarios():
    """テストシナリオの詳細を出力"""
    print("=" * 80)
    print("Knowledge Crawler クローリング範囲テストシナリオ")
    print("=" * 80)
    print()
    print("重要な制約:")
    print("1. 同一オリジン（scheme + netloc）である必要がある")
    print("2. かつ（現在のディレクトリ配下 OR pathPatternsに一致）である必要がある")
    print("3. pathPatternsによる拡張も同一オリジン内でのみ有効")
    print()
    
    scenarios = [
        {
            "title": "基本的なドキュメントサイト（同一オリジン制約あり）",
            "start_url": "https://example.com/docs/",
            "patterns": ["example.com/docs/*", "example.com/knowledge/*"],
            "crawlable": [
                "https://example.com/docs/api.html （ディレクトリ配下）",
                "https://example.com/docs/guide/intro.html （サブディレクトリ）",
                "https://example.com/knowledge/faq.html （pathPattern一致、同一オリジン）"
            ],
            "not_crawlable": [
                "https://example.com/blog/post1.html （pattern外）",
                "https://help.example.com/faq.html （異なるサブドメイン）",
                "https://other-site.com/docs/api.html （異なるドメイン）",
                "http://example.com/docs/api.html （異なるスキーム）"
            ]
        },
        {
            "title": "サブドメインから開始",
            "start_url": "https://docs.example.com/",
            "patterns": ["docs.example.com/*", "*.example.com/api/*"],
            "crawlable": [
                "https://docs.example.com/guide/intro.html （同一オリジン、ディレクトリ配下）",
                "https://docs.example.com/api/reference.html （同一オリジン、ディレクトリ配下）"
            ],
            "not_crawlable": [
                "https://api.example.com/v1/users.json （異なるサブドメイン）",
                "https://blog.example.com/post1.html （異なるサブドメイン）",
                "https://example.com/docs/ （メインドメイン）"
            ]
        },
        {
            "title": "同一オリジン内pathPattern拡張",
            "start_url": "https://shop.com/products/",
            "patterns": ["shop.com/products/*", "shop.com/categories/*", "shop.com/search*"],
            "crawlable": [
                "https://shop.com/products/laptop/macbook.html （ディレクトリ配下）",
                "https://shop.com/categories/electronics.html （pathPattern一致）",
                "https://shop.com/search?q=phone （pathPattern一致）"
            ],
            "not_crawlable": [
                "https://shop.com/admin/dashboard.html （pattern外）",
                "https://api.shop.com/v1/products （異なるサブドメイン）",
                "https://other-shop.com/products/ （異なるドメイン）"
            ]
        }
    ]
    
    for scenario in scenarios:
        print(f"【{scenario['title']}】")
        print(f"開始URL: {scenario['start_url']}")
        print(f"pathPatterns: {scenario['patterns']}")
        print("\n✓ クローリング可能:")
        for url in scenario['crawlable']:
            print(f"  - {url}")
        print("\n✗ クローリング不可:")
        for url in scenario['not_crawlable']:
            print(f"  - {url}")
        print()
    
    print("=" * 80)


if __name__ == "__main__":
    # テストシナリオの出力
    print_test_scenarios()
    
    # ユニットテストの実行
    unittest.main(verbosity=2) 
