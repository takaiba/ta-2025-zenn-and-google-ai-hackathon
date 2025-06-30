import time
import json
import logging
import os
import random
from datetime import datetime
from typing import Dict, List, Optional
from playwright.sync_api import sync_playwright
from .test_executor_enhanced import EnhancedTestExecutor
from .gemini_page_analyzer import GeminiPageAnalyzer, PlaywrightActionExecutor
from .activity_logger import ActivityLogger
from prisma import Prisma

logger = logging.getLogger(__name__)


class ContinuousTestExecutor:
    """10回ループでのテスト実行を管理するクラス"""
    
    def __init__(self, prisma: Prisma):
        self.prisma = prisma
        self.enhanced_executor = EnhancedTestExecutor(prisma)
        self.activity_logger = ActivityLogger()
        
        # ループ設定
        self.default_loop_count = 20
        self.loop_variations = [
            "desktop_chrome",
            "mobile_chrome", 
            "desktop_firefox",
            "tablet_ipad",
            "high_load",
            "accessibility_focus",
            "performance_focus",
            "interaction_heavy",
            "form_validation",
            "navigation_deep"
        ]
        
    def execute_continuous_test(self, session_id: str, url: str, loop_count: Optional[int] = None) -> Dict:
        """連続的なテスト実行（10回ループ）"""
        start_time = time.time()
        loop_count = loop_count or self.default_loop_count
        
        logger.info(f"Starting continuous test execution: {loop_count} loops for {url}")
        
        # テスト開始ログ
        self._log_to_session(session_id, 'info', f'連続テスト実行を開始 ({loop_count}回ループ)', {
            'url': url,
            'loop_count': loop_count,
            'variations': self.loop_variations[:loop_count]
        })
        
        # テスト開始のアクティビティをログ
        try:
            self.activity_logger.log_test_started('system', session_id, {
                'test_type': 'continuous',
                'url': url,
                'loop_count': loop_count
            })
        except Exception as e:
            logger.warning(f"Failed to log continuous test started: {e}")
        
        total_bugs = []
        total_pages_scanned = 0
        loop_results = []
        
        for loop_index in range(loop_count):
            loop_start_time = time.time()
            variation = self.loop_variations[loop_index % len(self.loop_variations)]
            
            self._log_to_session(session_id, 'info', f'ループ {loop_index + 1}/{loop_count} 開始: {variation}', {
                'loop_index': loop_index + 1,
                'variation': variation,
                'url': url
            })
            
            try:
                # 各ループで異なる設定でテストを実行
                loop_result = self._execute_single_loop(session_id, url, loop_index + 1, variation)
                loop_results.append(loop_result)
                
                # 結果を集計
                total_bugs.extend(loop_result.get('bugs', []))
                total_pages_scanned += loop_result.get('pages_scanned', 0)
                
                loop_duration = time.time() - loop_start_time
                self._log_to_session(session_id, 'info', f'ループ {loop_index + 1} 完了', {
                    'loop_index': loop_index + 1,
                    'variation': variation,
                    'duration': int(loop_duration),
                    'bugs_found': len(loop_result.get('bugs', [])),
                    'pages_scanned': loop_result.get('pages_scanned', 0)
                })
                
                # ループ間の待機時間（1-3秒のランダム）
                wait_time = random.uniform(1, 3)
                time.sleep(wait_time)
                
            except Exception as e:
                logger.error(f"Loop {loop_index + 1} failed: {e}")
                self._log_to_session(session_id, 'error', f'ループ {loop_index + 1} でエラー', {
                    'loop_index': loop_index + 1,
                    'variation': variation,
                    'error': str(e)
                })
                
                # エラーでも次のループは続行
                loop_results.append({
                    'loop_index': loop_index + 1,
                    'variation': variation,
                    'error': str(e),
                    'bugs': [],
                    'pages_scanned': 0
                })
        
        total_duration = int(time.time() - start_time)
        
        # 最終結果をまとめ
        final_result = {
            'test_type': 'continuous',
            'loop_count': loop_count,
            'total_duration': total_duration,
            'total_pages_scanned': total_pages_scanned,
            'total_bugs_found': len(total_bugs),
            'bugs': total_bugs,
            'loop_results': loop_results,
            'coverage_percentage': min(95, total_pages_scanned * 5),  # より高いカバレッジ
            'variations_tested': self.loop_variations[:loop_count]
        }
        
        self._log_to_session(session_id, 'info', '連続テスト実行完了', {
            'total_duration': total_duration,
            'total_bugs_found': len(total_bugs),
            'total_pages_scanned': total_pages_scanned,
            'successful_loops': len([r for r in loop_results if not r.get('error')])
        })
        
        # テスト完了のアクティビティをログ
        try:
            self.activity_logger.log_test_completed('system', session_id, {
                'test_type': 'continuous',
                'total_duration': total_duration,
                'total_bugs_found': len(total_bugs),
                'total_pages_scanned': total_pages_scanned,
                'loop_count': loop_count
            })
        except Exception as e:
            logger.warning(f"Failed to log continuous test completed: {e}")
        
        return final_result
    
    def _execute_single_loop(self, session_id: str, url: str, loop_index: int, variation: str) -> Dict:
        """単一ループの実行"""
        logger.info(f"Executing loop {loop_index} with variation: {variation}")
        
        # バリエーションに応じてテスト設定を調整
        test_config = self._get_test_config(variation)
        
        with sync_playwright() as p:
            # ブラウザとデバイスの設定
            browser_type = getattr(p, test_config['browser'])
            browser = browser_type.launch(
                headless=test_config.get('headless', True),
                slow_mo=test_config.get('slow_mo', 0)
            )
            
            context = browser.new_context(**test_config['context_options'])
            page = context.new_page()
            
            bugs_found = []
            pages_scanned = 0
            
            try:
                # ページにアクセス
                response = page.goto(url, wait_until='networkidle', timeout=30000)
                pages_scanned = 1
                
                # 初期スクリーンショット
                screenshot = page.screenshot(full_page=True)
                self._log_to_session(session_id, 'info', f'ループ{loop_index}: ページロード完了', {
                    'variation': variation,
                    'url': url,
                    'status_code': response.status if response else 'unknown'
                }, screenshot)
                
                # バリエーション固有のテストを実行
                if variation == "mobile_chrome":
                    bugs_found.extend(self._test_mobile_specific(page, url, session_id))
                elif variation == "accessibility_focus":
                    bugs_found.extend(self._test_accessibility_comprehensive(page, url, session_id))
                elif variation == "performance_focus":
                    bugs_found.extend(self._test_performance_comprehensive(page, url, session_id))
                elif variation == "interaction_heavy":
                    bugs_found.extend(self._test_interactive_comprehensive(page, url, session_id))
                elif variation == "form_validation":
                    bugs_found.extend(self._test_forms_comprehensive(page, url, session_id))
                elif variation == "navigation_deep":
                    navigation_result = self._test_navigation_comprehensive(page, url, session_id)
                    bugs_found.extend(navigation_result['bugs'])
                    pages_scanned += navigation_result['pages_visited']
                else:
                    # デフォルトテスト（基本的な機能テスト）
                    bugs_found.extend(self._test_basic_functionality(page, url, session_id))
                
                # バリエーション共通のAI分析
                ai_analysis = self._perform_ai_analysis(page, url, variation, session_id)
                bugs_found.extend(ai_analysis.get('bugs', []))
                
                # 結果を保存
                self._save_loop_results(session_id, loop_index, variation, bugs_found, pages_scanned)
                
            except Exception as e:
                logger.error(f"Error in loop {loop_index}: {e}")
                self._log_to_session(session_id, 'error', f'ループ{loop_index}でエラー発生', {
                    'variation': variation,
                    'error': str(e)
                })
                raise
            finally:
                browser.close()
        
        return {
            'loop_index': loop_index,
            'variation': variation,
            'bugs': bugs_found,
            'pages_scanned': pages_scanned,
            'success': True
        }
    
    def _get_test_config(self, variation: str) -> Dict:
        """バリエーションに応じたテスト設定を取得"""
        configs = {
            "desktop_chrome": {
                'browser': 'chromium',
                'context_options': {
                    'viewport': {'width': 1920, 'height': 1080},
                    'user_agent': 'QA3-Bot/1.0 Chrome/Desktop'
                }
            },
            "mobile_chrome": {
                'browser': 'chromium',
                'context_options': {
                    'viewport': {'width': 375, 'height': 667},
                    'user_agent': 'QA3-Bot/1.0 Chrome/Mobile',
                    'is_mobile': True,
                    'has_touch': True
                }
            },
            "desktop_firefox": {
                'browser': 'firefox',
                'context_options': {
                    'viewport': {'width': 1920, 'height': 1080},
                    'user_agent': 'QA3-Bot/1.0 Firefox/Desktop'
                }
            },
            "tablet_ipad": {
                'browser': 'webkit',
                'context_options': {
                    'viewport': {'width': 768, 'height': 1024},
                    'user_agent': 'QA3-Bot/1.0 Safari/iPad',
                    'is_mobile': True,
                    'has_touch': True
                }
            },
            "high_load": {
                'browser': 'chromium',
                'context_options': {
                    'viewport': {'width': 1920, 'height': 1080},
                    'user_agent': 'QA3-Bot/1.0 Chrome/HighLoad'
                },
                'slow_mo': 100  # 操作を遅くしてサーバー負荷をテスト
            }
        }
        
        return configs.get(variation, configs["desktop_chrome"])
    
    def _test_mobile_specific(self, page, url: str, session_id: str) -> List[Dict]:
        """モバイル固有のテスト"""
        bugs = []
        
        # タッチ操作のテスト
        try:
            # スワイプ可能な要素を探す
            swipeable_elements = page.query_selector_all('[data-swipe], .swiper, .carousel')
            for element in swipeable_elements:
                try:
                    # タッチスワイプをシミュレート
                    bbox = element.bounding_box()
                    if bbox:
                        page.touch_screen.tap(bbox['x'] + bbox['width'] / 2, bbox['y'] + bbox['height'] / 2)
                        time.sleep(0.5)
                except Exception as e:
                    bugs.append({
                        'type': 'mobile_interaction',
                        'error_message': f'タッチ操作に失敗: {str(e)}',
                        'url': url,
                        'severity': 'medium'
                    })
        except Exception as e:
            logger.warning(f"Mobile touch test failed: {e}")
        
        # レスポンシブデザインのチェック
        viewport_sizes = [
            {'width': 320, 'height': 568},  # iPhone SE
            {'width': 375, 'height': 812},  # iPhone X
            {'width': 414, 'height': 896}   # iPhone Plus
        ]
        
        for size in viewport_sizes:
            try:
                page.set_viewport_size(size['width'], size['height'])
                time.sleep(1)
                
                # 横スクロールが発生していないかチェック
                scroll_width = page.evaluate('document.documentElement.scrollWidth')
                client_width = page.evaluate('document.documentElement.clientWidth')
                
                if scroll_width > client_width + 10:  # 10pxのマージンを許容
                    bugs.append({
                        'type': 'responsive_design',
                        'error_message': f'幅{size["width"]}pxで横スクロールが発生',
                        'url': url,
                        'severity': 'high'
                    })
                    
            except Exception as e:
                logger.warning(f"Responsive test failed for {size}: {e}")
        
        return bugs
    
    def _test_accessibility_comprehensive(self, page, url: str, session_id: str) -> List[Dict]:
        """包括的なアクセシビリティテスト"""
        bugs = []
        
        # キーボードナビゲーションのテスト
        try:
            # Tab キーでのナビゲーション
            focusable_elements = page.query_selector_all('a, button, input, select, textarea, [tabindex]')
            for i in range(min(30, len(focusable_elements))):
                page.keyboard.press('Tab')
                time.sleep(0.1)
                
                # フォーカスが見えるかチェック
                focused_element = page.evaluate('document.activeElement')
                if not focused_element:
                    bugs.append({
                        'type': 'accessibility',
                        'error_message': 'キーボードフォーカスが見えません',
                        'url': url,
                        'severity': 'high'
                    })
                    break
        except Exception as e:
            logger.warning(f"Keyboard navigation test failed: {e}")
        
        # セマンティックHTML構造のチェック
        try:
            # 見出しの階層構造
            headings = page.query_selector_all('h1, h2, h3, h4, h5, h6')
            heading_levels = [int(h.tag_name[1]) for h in headings]
            
            prev_level = 0
            for level in heading_levels:
                if prev_level > 0 and level > prev_level + 1:
                    bugs.append({
                        'type': 'accessibility',
                        'error_message': f'見出しレベルがスキップされています (h{prev_level} → h{level})',
                        'url': url,
                        'severity': 'medium'
                    })
                prev_level = level
                
            # ランドマークの存在確認
            landmarks = page.query_selector_all('[role="main"], main, [role="navigation"], nav, [role="banner"], header')
            if len(landmarks) == 0:
                bugs.append({
                    'type': 'accessibility',
                    'error_message': 'ランドマーク要素が見つかりません',
                    'url': url,
                    'severity': 'medium'
                })
                
        except Exception as e:
            logger.warning(f"Semantic HTML test failed: {e}")
        
        return bugs
    
    def _test_performance_comprehensive(self, page, url: str, session_id: str) -> List[Dict]:
        """包括的なパフォーマンステスト"""
        bugs = []
        
        try:
            # パフォーマンスメトリクスを取得
            metrics = page.evaluate('''() => {
                const perf = window.performance;
                const navigation = perf.getEntriesByType('navigation')[0];
                
                return {
                    loadTime: navigation.loadEventEnd - navigation.fetchStart,
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                    firstPaint: perf.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
                    firstContentfulPaint: perf.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
                    resourceCount: perf.getEntriesByType('resource').length,
                    totalResourceSize: perf.getEntriesByType('resource').reduce((total, resource) => total + (resource.transferSize || 0), 0)
                };
            }''')
            
            # パフォーマンス基準をチェック
            if metrics['loadTime'] > 3000:  # 3秒以上
                bugs.append({
                    'type': 'performance',
                    'error_message': f'ページロード時間が遅すぎます ({metrics["loadTime"]:.0f}ms)',
                    'url': url,
                    'severity': 'high'
                })
            
            if metrics['firstContentfulPaint'] > 1500:  # 1.5秒以上
                bugs.append({
                    'type': 'performance',
                    'error_message': f'First Contentful Paintが遅すぎます ({metrics["firstContentfulPaint"]:.0f}ms)',
                    'url': url,
                    'severity': 'medium'
                })
            
            if metrics['resourceCount'] > 100:
                bugs.append({
                    'type': 'performance',
                    'error_message': f'リソース数が多すぎます ({metrics["resourceCount"]}個)',
                    'url': url,
                    'severity': 'low'
                })
            
            if metrics['totalResourceSize'] > 5 * 1024 * 1024:  # 5MB以上
                bugs.append({
                    'type': 'performance',
                    'error_message': f'総リソースサイズが大きすぎます ({metrics["totalResourceSize"] / 1024 / 1024:.1f}MB)',
                    'url': url,
                    'severity': 'medium'
                })
                
        except Exception as e:
            logger.warning(f"Performance test failed: {e}")
        
        return bugs
    
    def _test_interactive_comprehensive(self, page, url: str, session_id: str) -> List[Dict]:
        """包括的なインタラクティブ要素テスト"""
        bugs = []
        
        # 全てのクリック可能要素をテスト
        clickable_elements = page.query_selector_all('button, a, input[type="submit"], input[type="button"], [onclick], [role="button"]')
        
        for i, element in enumerate(clickable_elements[:15]):  # 最大15要素
            try:
                if not element.is_visible():
                    continue
                
                element_text = element.text_content() or element.get_attribute('aria-label') or f'Element {i+1}'
                
                # クリック前の状態を記録
                initial_url = page.url
                
                # 要素をクリック
                element.click(timeout=5000)
                time.sleep(1)
                
                # エラーダイアログや404ページをチェック
                error_indicators = page.query_selector_all('.error, .alert-danger, [role="alert"], .not-found')
                if error_indicators:
                    error_text = error_indicators[0].text_content()
                    bugs.append({
                        'type': 'interaction_error',
                        'error_message': f'要素 "{element_text}" クリック後にエラー: {error_text}',
                        'url': url,
                        'severity': 'high'
                    })
                
                # ページタイトルに "404" や "Error" が含まれているかチェック
                page_title = page.title().lower()
                if '404' in page_title or 'error' in page_title or 'not found' in page_title:
                    bugs.append({
                        'type': 'navigation_error',
                        'error_message': f'要素 "{element_text}" クリック後にエラーページへ遷移',
                        'url': url,
                        'severity': 'high'
                    })
                
                # 元のページに戻る（可能であれば）
                if page.url != initial_url:
                    try:
                        page.go_back()
                        page.wait_for_load_state('networkidle', timeout=5000)
                    except:
                        page.goto(url, wait_until='networkidle', timeout=10000)
                        
            except Exception as e:
                if 'timeout' not in str(e).lower():
                    bugs.append({
                        'type': 'interaction_error',
                        'error_message': f'要素 "{element_text if "element_text" in locals() else f"Element {i+1}"}" の操作に失敗: {str(e)}',
                        'url': url,
                        'severity': 'medium'
                    })
        
        return bugs
    
    def _test_forms_comprehensive(self, page, url: str, session_id: str) -> List[Dict]:
        """包括的なフォームテスト"""
        bugs = []
        
        forms = page.query_selector_all('form')
        
        for form_index, form in enumerate(forms[:3]):  # 最大3フォーム
            try:
                # フォーム内の入力要素を取得
                inputs = form.query_selector_all('input, select, textarea')
                
                for input_elem in inputs:
                    input_type = input_elem.get_attribute('type') or 'text'
                    input_name = input_elem.get_attribute('name') or f'input_{form_index}'
                    
                    # バリデーションテスト
                    if input_type == 'email':
                        # 無効なメールアドレスでテスト
                        input_elem.fill('invalid-email')
                        
                        # フォーム送信を試行
                        submit_btn = form.query_selector('input[type="submit"], button[type="submit"], button:not([type])')
                        if submit_btn:
                            submit_btn.click()
                            time.sleep(0.5)
                            
                            # バリデーションエラーが表示されるかチェック
                            validation_errors = page.query_selector_all('.error, .invalid, [aria-invalid="true"]')
                            if not validation_errors:
                                bugs.append({
                                    'type': 'form_validation',
                                    'error_message': f'メールフィールド "{input_name}" で無効な値のバリデーションが機能していません',
                                    'url': url,
                                    'severity': 'medium'
                                })
                    
                    elif input_type == 'tel':
                        # 無効な電話番号でテスト
                        input_elem.fill('invalid-phone')
                        
                    elif input_type == 'url':
                        # 無効なURLでテスト
                        input_elem.fill('not-a-url')
                
                # 必須フィールドのテスト
                required_inputs = form.query_selector_all('[required]')
                for req_input in required_inputs:
                    req_input.fill('')  # 空にする
                
                # フォーム送信を試行
                submit_btn = form.query_selector('input[type="submit"], button[type="submit"], button:not([type])')
                if submit_btn:
                    submit_btn.click()
                    time.sleep(0.5)
                    
                    # 必須フィールドエラーが表示されるかチェック
                    required_errors = page.query_selector_all('.required, [aria-invalid="true"]')
                    if not required_errors and required_inputs:
                        bugs.append({
                            'type': 'form_validation',
                            'error_message': '必須フィールドのバリデーションが機能していません',
                            'url': url,
                            'severity': 'high'
                        })
                        
            except Exception as e:
                logger.warning(f"Form test failed for form {form_index}: {e}")
        
        return bugs
    
    def _test_navigation_comprehensive(self, page, url: str, session_id: str) -> Dict:
        """包括的なナビゲーションテスト"""
        bugs = []
        pages_visited = 0
        visited_urls = set()
        
        try:
            # 現在のページのリンクを取得
            links = page.query_selector_all('a[href]')
            
            for link in links[:5]:  # 最大5リンク
                try:
                    href = link.get_attribute('href')
                    if not href or href.startswith('#') or href.startswith('mailto:') or href.startswith('tel:'):
                        continue
                    
                    # 絶対URLに変換
                    from urllib.parse import urljoin, urlparse
                    absolute_url = urljoin(url, href)
                    parsed = urlparse(absolute_url)
                    
                    # 同一ドメインのみテスト
                    base_domain = urlparse(url).netloc
                    if parsed.netloc != base_domain:
                        continue
                    
                    if absolute_url in visited_urls:
                        continue
                    
                    visited_urls.add(absolute_url)
                    
                    # リンクをクリック
                    link.click(timeout=5000)
                    page.wait_for_load_state('networkidle', timeout=10000)
                    pages_visited += 1
                    
                    # レスポンスステータスをチェック
                    current_url = page.url
                    page_title = page.title()
                    
                    if '404' in page_title.lower() or 'not found' in page_title.lower():
                        bugs.append({
                            'type': 'broken_link',
                            'error_message': f'リンクが404ページに遷移: {absolute_url}',
                            'url': url,
                            'severity': 'high'
                        })
                    
                    # 元のページに戻る
                    page.go_back()
                    page.wait_for_load_state('networkidle', timeout=5000)
                    
                except Exception as e:
                    logger.warning(f"Navigation test failed for link: {e}")
                    try:
                        # エラー時は元のページに戻る
                        page.goto(url, wait_until='networkidle', timeout=10000)
                    except:
                        pass
                        
        except Exception as e:
            logger.warning(f"Navigation test failed: {e}")
        
        return {
            'bugs': bugs,
            'pages_visited': pages_visited
        }
    
    def _test_basic_functionality(self, page, url: str, session_id: str) -> List[Dict]:
        """基本機能テスト"""
        bugs = []
        
        # JavaScriptエラーをチェック
        try:
            js_errors = page.evaluate('''() => {
                const errors = window.jsErrors || [];
                return errors;
            }''')
            
            if js_errors:
                for error in js_errors:
                    bugs.append({
                        'type': 'javascript_error',
                        'error_message': f'JavaScriptエラー: {error}',
                        'url': url,
                        'severity': 'medium'
                    })
        except Exception as e:
            logger.warning(f"JavaScript error check failed: {e}")
        
        # コンソールエラーをキャッチ
        console_errors = []
        def handle_console(msg):
            if msg.type == 'error':
                console_errors.append(msg.text)
        
        page.on('console', handle_console)
        
        # ページを再読み込みしてコンソールエラーをキャッチ
        page.reload(wait_until='networkidle')
        
        for error in console_errors:
            bugs.append({
                'type': 'console_error',
                'error_message': f'コンソールエラー: {error}',
                'url': url,
                'severity': 'low'
            })
        
        return bugs
    
    def _perform_ai_analysis(self, page, url: str, variation: str, session_id: str) -> Dict:
        """AI分析を実行"""
        try:
            # スクリーンショットを取得
            screenshot = page.screenshot(full_page=True)
            
            # 既存のEnhanced Executorの分析機能を使用
            analysis_result = self.enhanced_executor._analyze_with_gemini(
                url, page.title(), screenshot, page.content()
            )
            
            bugs = []
            for issue in analysis_result.get('issues', []):
                bugs.append({
                    'type': f"{variation}_{issue.get('type', 'unknown')}",
                    'error_message': f"[{variation}] {issue.get('description', '')}",
                    'url': url,
                    'severity': issue.get('severity', 'medium'),
                    'element': issue.get('element', ''),
                    'variation': variation
                })
            
            return {'bugs': bugs}
            
        except Exception as e:
            logger.error(f"AI analysis failed for {variation}: {e}")
            return {'bugs': []}
    
    def _save_loop_results(self, session_id: str, loop_index: int, variation: str, bugs: List[Dict], pages_scanned: int):
        """ループ結果をデータベースに保存"""
        try:
            import psycopg2
            import uuid
            
            db_url = os.environ.get('DATABASE_ROOT_URL', '')
            if '127.0.0.1' in db_url or 'localhost' in db_url:
                db_url = db_url.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal')
            
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            # プロジェクトIDを取得
            cursor.execute("""
                SELECT ts.project_id FROM "TestSession" ts WHERE ts.id = %s
            """, (session_id,))
            result = cursor.fetchone()
            
            if result:
                project_id = result[0]
                
                # 各バグをBugTicketとして保存
                for bug in bugs:
                    bug_ticket_id = str(uuid.uuid4())
                    test_result_id = str(uuid.uuid4())
                    
                    # TestResultを作成
                    cursor.execute("""
                        INSERT INTO "TestResult" (id, test_session_id, url, status, execution_time, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                    """, (test_result_id, session_id, bug.get('url', ''), "failed", 0))
                    
                    # BugTicketを作成
                    cursor.execute("""
                        INSERT INTO "BugTicket" (id, project_id, test_session_id, test_result_id, reported_by_id, 
                            title, description, severity, bug_type, affected_url, reproduction_steps, 
                            expected_behavior, actual_behavior, affected_components, 
                            ai_confidence_score, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """, (
                        bug_ticket_id, project_id, session_id, test_result_id, 'system',
                        f"[Loop {loop_index}-{variation}] {bug.get('type', 'unknown')}",
                        bug.get('error_message', ''),
                        bug.get('severity', 'medium'),
                        bug.get('type', 'unknown'),
                        bug.get('url', ''),
                        json.dumps({"steps": [f"Loop {loop_index} with {variation} variation"]}),
                        "No errors should occur",
                        bug.get('error_message', ''),
                        '{' + bug.get('element', 'page') + '}',
                        0.9
                    ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to save loop results: {e}")
    
    def _log_to_session(self, session_id: str, level: str, message: str, metadata: Dict = None, screenshot: bytes = None):
        """セッションログに記録"""
        try:
            import psycopg2
            import base64
            
            db_url = os.environ.get('DATABASE_ROOT_URL', '')
            if '127.0.0.1' in db_url or 'localhost' in db_url:
                db_url = db_url.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal')
            
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            screenshot_b64 = None
            if screenshot:
                screenshot_b64 = base64.b64encode(screenshot).decode('utf-8')
            
            cursor.execute("""
                INSERT INTO "TestSessionLog" (id, test_session_id, log_level, message, metadata, screenshot, created_at)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW())
            """, (session_id, level, message, json.dumps(metadata or {}), screenshot_b64))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to log to session: {e}")