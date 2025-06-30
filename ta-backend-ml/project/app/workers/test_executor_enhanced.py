import time
import json
import logging
import os
import base64
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
from typing import Dict, List, Optional, Tuple, Set
import google.generativeai as genai
from prisma import Prisma
from concurrent.futures import ThreadPoolExecutor, as_completed
import queue
import threading
from urllib.parse import urljoin, urlparse
from .gemini_page_analyzer import GeminiPageAnalyzer, PlaywrightActionExecutor
from .activity_logger import ActivityLogger
import psycopg2
import uuid
import traceback

logger = logging.getLogger(__name__)


class EnhancedTestExecutor:
    """Enhanced Test Executor with recursive crawling and parallel execution"""
    
    def __init__(self, prisma: Prisma):
        self.prisma = prisma
        # Gemini APIの設定
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # 新しいアナライザー、エグゼキューター、アクティビティロガーを初期化
        self.page_analyzer = GeminiPageAnalyzer(api_key)
        self.action_executor = PlaywrightActionExecutor()
        self.activity_logger = ActivityLogger()
        
        # 並列実行の設定
        self.max_workers = 8
        self.max_depth = 5
        self.visited_urls = set()
        self.url_queue = queue.Queue()
        self.bugs_found = []
        self.lock = threading.Lock()
        self.processed_urls = set()  # 処理済みURLを追跡
        
    def execute(self, session_id: str, mode: str, url: str, scenario_id: Optional[str] = None) -> Dict:
        """Execute enhanced test with recursive crawling and parallel execution"""
        start_time = time.time()
        
        logger.info(f"Starting enhanced test execution for session {session_id}")
        self._log_to_session(session_id, 'info', 'テスト実行を開始します', {
            'url': url,
            'mode': mode,
            'max_workers': self.max_workers,
            'max_depth': self.max_depth
        })
        
        # テスト開始のアクティビティをログ
        try:
            self.activity_logger.log_test_started('system', session_id, {
                'url': url,
                'mode': mode
            })
        except Exception as e:
            logger.warning(f"Failed to log test started activity: {e}")
        
        if mode == "omakase":
            result = self._execute_enhanced_omakase_mode(session_id, url)
        else:
            # 他のモードは既存の実装を使用
            from app.workers.test_executor import TestExecutor
            executor = TestExecutor(self.prisma)
            result = executor.execute(session_id, mode, url, scenario_id)
        
        duration = int(time.time() - start_time)
        result["duration"] = duration
        
        self._log_to_session(session_id, 'info', 'テスト実行が完了しました', {
            'duration': duration,
            'pages_scanned': result.get('pages_scanned', 0),
            'bugs_found': result.get('bugs_found', 0)
        })
        
        # テスト完了のアクティビティをログ
        try:
            self.activity_logger.log_test_completed('system', session_id, {
                'duration': duration,
                'pages_scanned': result.get('pages_scanned', 0),
                'bugs_found': result.get('bugs_found', 0)
            })
        except Exception as e:
            logger.warning(f"Failed to log test completed activity: {e}")
        
        return result
    
    def _execute_enhanced_omakase_mode(self, session_id: str, url: str) -> Dict:
        """Execute enhanced autonomous testing with recursive crawling"""
        logger.info(f"Executing enhanced omakase mode for session {session_id}")
        
        # 初期化
        self.url_queue = queue.Queue()
        self.visited_urls.clear()
        self.processed_urls.clear()
        self.bugs_found = []
        
        # 初期URLを必ず処理するように修正
        initial_url = url.strip()
        self.url_queue.put((initial_url, 0))  # (URL, depth)
        
        pages_scanned = 0
        
        # 並列実行用のThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = []
            
            # 初期URLを即座に処理開始
            if not self.url_queue.empty():
                url_info = self.url_queue.get()
                future = executor.submit(self._process_page, session_id, url_info[0], url_info[1])
                futures.append(future)
                self.processed_urls.add(url_info[0])
                
                self._log_to_session(session_id, 'info', '初期URLの処理を開始', {
                    'url': url_info[0],
                    'depth': url_info[1]
                })
            
            while futures or not self.url_queue.empty():
                # 新しいURLがあれば処理を開始
                while not self.url_queue.empty() and len(futures) < self.max_workers:
                    try:
                        url_info = self.url_queue.get_nowait()
                        if url_info[0] not in self.processed_urls:
                            future = executor.submit(self._process_page, session_id, url_info[0], url_info[1])
                            futures.append(future)
                            self.processed_urls.add(url_info[0])
                    except queue.Empty:
                        break
                
                # 完了したタスクを処理
                if futures:
                    done, futures = self._wait_for_any_complete(futures, timeout=1)
                    for future in done:
                        try:
                            page_result = future.result()
                            if page_result.get('processed', False):
                                pages_scanned += 1
                            
                            # 発見されたURLをキューに追加
                            for new_url in page_result.get('discovered_urls', []):
                                if new_url not in self.processed_urls and new_url not in self.visited_urls:
                                    depth = page_result.get('depth', 0) + 1
                                    if depth <= self.max_depth:
                                        self.url_queue.put((new_url, depth))
                                        
                        except Exception as e:
                            logger.error(f"Error processing page: {e}")
        
        return {
            "pages_scanned": pages_scanned,
            "bugs_found": len(self.bugs_found),
            "test_coverage": min(0.9, pages_scanned * 0.1),  # より現実的なカバレッジ計算
            "bugs": self.bugs_found[:50]  # 最大50個のバグを返す
        }
    
    def _process_page(self, session_id: str, url: str, depth: int) -> Dict:
        """Process a single page with Playwright and Gemini"""
        logger.info(f"Processing page: {url} (depth: {depth})")
        
        # URLの正規化
        url = url.strip()
        
        with self.lock:
            if url in self.visited_urls:
                return {"discovered_urls": [], "depth": depth, "processed": False}
            self.visited_urls.add(url)
        
        self._log_to_session(session_id, 'info', f'ページを分析中: {url}', {
            'url': url,
            'depth': depth
        })
        
        discovered_urls = []
        page_bugs = []
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='QA3-Bot/1.0'
            )
            page = context.new_page()
            
            try:
                # ページに移動
                response = page.goto(url, wait_until='networkidle', timeout=30000)
                
                if response and response.status >= 400:
                    bug = {
                        "type": "http_error",
                        "error_message": f"HTTP {response.status} エラー",
                        "url": url,
                        "severity": "high" if response.status >= 500 else "medium"
                    }
                    page_bugs.append(bug)
                    self._add_bug(bug)
                
                # スクリーンショットを取得
                screenshot = page.screenshot(full_page=True)
                
                # ページコンテンツを取得
                page_content = page.content()
                page_title = page.title()
                
                # ページロード時のスクリーンショットをログに保存
                self._log_to_session(session_id, 'info', f'ページをロードしました: {url}', {
                    'url': url,
                    'title': page_title,
                    'depth': depth
                }, screenshot)
                
                # 現在の状態を準備
                current_state = {
                    'pages_visited': len(self.visited_urls),
                    'depth': depth,
                    'bugs_found': len(self.bugs_found)
                }
                
                # Gemini APIでページを分析し、アクションを生成
                gemini_result = self.page_analyzer.analyze_page_and_generate_actions(
                    url, screenshot, page_content, page_title, current_state
                )
                
                # Geminiが提案したアクションを実行
                if gemini_result.get('actions'):
                    self._log_to_session(session_id, 'info', f'Geminiが{len(gemini_result["actions"])}個のアクションを生成', {
                        'url': url,
                        'actions': [a['description'] for a in gemini_result['actions'][:5]]  # 最初の5個のみログ
                    })
                    
                    # アクションを実行
                    action_results = self.action_executor.execute_actions(page, gemini_result['actions'])
                    
                    # アクション実行後に再度スクリーンショットを取得して分析
                    if any(r['success'] for r in action_results):
                        time.sleep(1)  # アクションの効果を待つ
                        post_action_screenshot = page.screenshot(full_page=True)
                        post_action_content = page.content()
                        
                        # アクション実行後のスクリーンショットをログに保存
                        self._log_to_session(session_id, 'info', f'アクション実行後: {url}', {
                            'url': url,
                            'successful_actions': len([r for r in action_results if r['success']]),
                            'failed_actions': len([r for r in action_results if not r['success']])
                        }, post_action_screenshot)
                        
                        # アクション後の分析
                        post_analysis = self._analyze_with_gemini(url, page.title(), post_action_screenshot, post_action_content)
                        for issue in post_analysis.get('issues', []):
                            bug = {
                                "type": issue.get('type', 'unknown'),
                                "error_message": f"[アクション後] {issue.get('description', '')}",
                                "url": url,
                                "severity": issue.get('severity', 'medium'),
                                "element": issue.get('element', ''),
                                "screenshot": base64.b64encode(post_action_screenshot).decode('utf-8') if issue.get('visual', False) else None
                            }
                            page_bugs.append(bug)
                            self._add_bug(bug)
                
                # action_results変数を初期化
                action_results = []
                
                # 初回分析結果も処理
                analysis_result = self._analyze_with_gemini(url, page_title, screenshot, page_content)
                logger.info(f"Gemini analysis result for {url}: {json.dumps(analysis_result, indent=2)}")
                
                # 分析結果からバグを抽出
                issues = analysis_result.get('issues', [])
                logger.info(f"Found {len(issues)} issues from Gemini analysis for {url}")
                for issue in issues:
                    bug = {
                        "type": issue.get('type', 'unknown'),
                        "error_message": issue.get('description', ''),
                        "url": url,
                        "severity": issue.get('severity', 'medium'),
                        "element": issue.get('element', ''),
                        "screenshot": base64.b64encode(screenshot).decode('utf-8') if issue.get('visual', False) else None
                    }
                    page_bugs.append(bug)
                    self._add_bug(bug)
                    
                    # バグ発見時のスクリーンショットをログに保存
                    self._log_to_session(session_id, 'warning', f'バグを発見: {issue.get("description", "")}', {
                        'url': url,
                        'bug_type': issue.get('type', 'unknown'),
                        'severity': issue.get('severity', 'medium'),
                        'element': issue.get('element', '')
                    }, screenshot)
                
                # インタラクティブ要素のテスト
                interactive_bugs = self._test_interactive_elements(page, url)
                if interactive_bugs:
                    logger.info(f"Found {len(interactive_bugs)} interactive bugs for {url}")
                page_bugs.extend(interactive_bugs)
                
                # アクセシビリティチェック
                accessibility_bugs = self._check_accessibility_enhanced(page, url)
                if accessibility_bugs:
                    logger.info(f"Found {len(accessibility_bugs)} accessibility bugs for {url}")
                page_bugs.extend(accessibility_bugs)
                
                # パフォーマンスチェック
                performance_bugs = self._check_performance(page, url)
                if performance_bugs:
                    logger.info(f"Found {len(performance_bugs)} performance bugs for {url}")
                page_bugs.extend(performance_bugs)
                
                # 同一ドメイン内のリンクを収集
                if depth < self.max_depth:
                    links = self._extract_links(page, url)
                    discovered_urls.extend(links)
                    
                    # Geminiが提案したナビゲーションも追加
                    for nav in gemini_result.get('navigation_suggestions', []):
                        nav_url = nav.get('url', '')
                        if nav_url and self._is_same_domain(url, nav_url):
                            discovered_urls.append(nav_url)
                
                # テスト結果を保存（バグがない場合も成功として保存）
                try:
                    db_url = os.environ.get('DATABASE_ROOT_URL', '')
                    logger.info(f"Database URL (before modification): {db_url[:30]}...")
                    if '127.0.0.1' in db_url or 'localhost' in db_url:
                        db_url = db_url.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal')
                        logger.info(f"Database URL (after modification): {db_url[:30]}...")
                    
                    logger.info(f"Connecting to database...")
                    conn = psycopg2.connect(db_url)
                    logger.info(f"Database connection established")
                    cursor = conn.cursor()
                    
                    # プロジェクトIDを取得
                    cursor.execute("""
                        SELECT ts.project_id FROM "TestSession" ts WHERE ts.id = %s
                    """, (session_id,))
                    result = cursor.fetchone()
                    if not result:
                        logger.error(f"TestSession not found for session_id: {session_id}")
                        conn.close()
                    else:
                        project_id = result[0]
                        
                        # バグがない場合でも成功のTestResultを作成
                        if len(page_bugs) == 0:
                            test_result_id = str(uuid.uuid4())
                            result_screenshot = base64.b64encode(screenshot).decode('utf-8') if screenshot else None
                            
                            # テスト結果の詳細情報を準備
                            test_details = {
                                "gemini_analysis": analysis_result,
                                "gemini_actions": gemini_result.get('actions', []),
                                "action_results": action_results,
                                "page_title": page_title,
                                "test_type": "ai_analysis",
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                                "status": "success",
                                "message": "No issues found"
                            }
                            
                            cursor.execute("""
                                INSERT INTO "TestResult" (id, test_session_id, url, status, execution_time, screenshot, 
                                    console_logs, network_logs, user_actions, dom_snapshot, details, created_at, updated_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            """, (
                                test_result_id, session_id, url, "passed", 0, result_screenshot,
                                json.dumps([]),
                                json.dumps([]),
                                json.dumps([{"action": "page_analysis", "url": url}]),
                                '',
                                json.dumps(test_details, ensure_ascii=False)
                            ))
                            logger.info(f"Saved successful test result for {url}")
                        
                        conn.commit()
                        conn.close()
                
                except Exception as e:
                    logger.error(f"Failed to save test result without bugs: {e}")
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    if 'conn' in locals():
                        try:
                            conn.close()
                        except:
                            pass
                
                # バグが存在する場合の処理
                logger.info(f"Saving {len(page_bugs)} bugs to database for URL: {url}")
                for i, bug in enumerate(page_bugs):
                    try:
                        # BugTicketテーブルに保存
                        db_url = os.environ.get('DATABASE_ROOT_URL', '')
                        logger.info(f"Database URL (before modification): {db_url[:30]}...")
                        if '127.0.0.1' in db_url or 'localhost' in db_url:
                            db_url = db_url.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal')
                            logger.info(f"Database URL (after modification): {db_url[:30]}...")
                        
                        logger.info(f"Connecting to database...")
                        conn = psycopg2.connect(db_url)
                        logger.info(f"Database connection established")
                        cursor = conn.cursor()
                        
                        # まず、プロジェクトIDを取得
                        cursor.execute("""
                            SELECT ts.project_id FROM "TestSession" ts WHERE ts.id = %s
                        """, (session_id,))
                        result = cursor.fetchone()
                        if not result:
                            logger.error(f"TestSession not found for session_id: {session_id}")
                            conn.close()
                            continue
                        if result:
                            project_id = result[0]
                            
                            # TestResultを作成
                            test_result_id = str(uuid.uuid4())
                            
                            # スクリーンショットを準備
                            result_screenshot = bug.get("screenshot")
                            if not result_screenshot and screenshot:
                                result_screenshot = base64.b64encode(screenshot).decode('utf-8')
                            
                            # テスト結果の詳細情報を準備
                            test_details = {
                                "gemini_analysis": analysis_result,
                                "gemini_actions": gemini_result.get('actions', []),
                                "action_results": action_results if 'action_results' in locals() else [],
                                "page_title": page_title,
                                "bug_details": bug,
                                "test_type": "ai_analysis",
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            }
                            
                            cursor.execute("""
                                INSERT INTO "TestResult" (id, test_session_id, url, status, execution_time, screenshot, 
                                    console_logs, network_logs, user_actions, dom_snapshot, details, created_at, updated_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            """, (
                                test_result_id, session_id, url, "failed", 0, result_screenshot,
                                json.dumps(bug.get('console_logs', [])),
                                json.dumps(bug.get('network_logs', [])),
                                json.dumps([{"action": "page_analysis", "url": url}]),
                                bug.get('dom_snapshot', ''),
                                json.dumps(test_details, ensure_ascii=False)
                            ))
                            
                            # BugTicketを作成
                            bug_screenshot = bug.get('screenshot')
                            if not bug_screenshot and screenshot:
                                bug_screenshot = base64.b64encode(screenshot).decode('utf-8')
                            
                            bug_ticket_id = str(uuid.uuid4())
                            # バグチケットの詳細情報を準備
                            bug_details = {
                                "detection_method": "gemini_analysis",
                                "analysis_result": analysis_result.get('issues', []),
                                "action_executed": 'action_results' in locals(),
                                "action_results": action_results if 'action_results' in locals() else [],
                                "page_context": {
                                    "title": page_title,
                                    "url": url,
                                    "timestamp": datetime.now(timezone.utc).isoformat()
                                },
                                "element_details": bug.get('element_details', {}),
                                "visual_issue": bug.get('visual', False)
                            }
                            
                            cursor.execute("""
                                INSERT INTO "BugTicket" (id, project_id, test_session_id, test_result_id, reported_by_id, 
                                    title, description, severity, bug_type, affected_url, reproduction_steps, 
                                    expected_behavior, actual_behavior, screenshot, affected_components, 
                                    ai_confidence_score, details, created_at, updated_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            """, (
                                bug_ticket_id, project_id, session_id, test_result_id, 'system',
                                f"{bug.get('type', 'unknown')} - {url}",
                                bug.get('error_message', ''),
                                bug.get('severity', 'medium'),
                                bug.get('type', 'unknown'),
                                url,
                                json.dumps({"steps": ["Navigate to URL", "Page analysis"]}),
                                "Page should render without issues",
                                bug.get('error_message', ''),
                                bug_screenshot,
                                '{' + bug.get('element', 'page') + '}',  # PostgreSQL配列形式
                                0.8,
                                json.dumps(bug_details, ensure_ascii=False)
                            ))
                            
                            # バグコメントを作成
                            if bug.get('error_message'):
                                bug_comment_id = str(uuid.uuid4())
                                cursor.execute("""
                                    INSERT INTO "BugComment" (id, bug_ticket_id, author_id, content, created_at, updated_at)
                                    VALUES (%s, %s, %s, %s, NOW(), NOW())
                                """, (
                                    bug_comment_id, bug_ticket_id, 'system',
                                    f"AI検出結果: {bug.get('error_message', '')}\n要素: {bug.get('element', 'page')}\n信頼度: {bug.get('confidence', 0.8)}"
                                ))
                            
                            # バグ報告のアクティビティをログ
                            try:
                                self.activity_logger.log_bug_reported('system', bug_ticket_id, {
                                    'bug_type': bug.get('type', 'unknown'),
                                    'severity': bug.get('severity', 'medium'),
                                    'url': url
                                }, screenshot)
                            except Exception as e:
                                logger.warning(f"Failed to log bug reported activity: {e}")
                            
                        conn.commit()
                        logger.info(f"Successfully saved bug ticket {bug_ticket_id} for {url}")
                        conn.close()
                    except psycopg2.Error as db_err:
                        logger.error(f"Database error while saving bug ticket: {db_err}")
                        logger.error(f"Error code: {db_err.pgcode if hasattr(db_err, 'pgcode') else 'N/A'}")
                        logger.error(f"Error detail: {db_err.pgerror if hasattr(db_err, 'pgerror') else 'N/A'}")
                        logger.error(f"Bug data: {json.dumps(bug, indent=2)}")
                        if 'conn' in locals():
                            try:
                                conn.rollback()
                                conn.close()
                            except:
                                pass
                    except Exception as e:
                        logger.error(f"Failed to save bug ticket: {e}")
                        logger.error(f"Exception type: {type(e).__name__}")
                        logger.error(f"Bug data: {json.dumps(bug, indent=2)}")
                        logger.error(f"Traceback: {traceback.format_exc()}")
                        if 'conn' in locals():
                            try:
                                conn.close()
                            except:
                                pass
                
                self._log_to_session(session_id, 'info', f'ページ分析完了: {len(page_bugs)}個の問題を発見', {
                    'url': url,
                    'bugs_found': len(page_bugs),
                    'links_discovered': len(discovered_urls)
                }, screenshot if len(page_bugs) > 0 else None)  # バグがある場合のみスクリーンショットを保存
                
            except Exception as e:
                logger.error(f"Error processing page {url}: {e}")
                self._log_to_session(session_id, 'error', f'ページ処理中にエラー: {url}', {
                    'error': str(e)
                })
                
                # エラーのアクティビティをログ
                try:
                    self.activity_logger.log_activity('system', 'test_error', 'test_session', session_id, {
                        'url': url,
                        'error': str(e)
                    })
                except Exception as activity_error:
                    logger.warning(f"Failed to log error activity: {activity_error}")
                
            finally:
                browser.close()
        
        return {
            "discovered_urls": discovered_urls,
            "bugs": page_bugs,
            "depth": depth,
            "processed": True
        }
    
    def _analyze_with_gemini(self, url: str, title: str, screenshot: bytes, content: str) -> Dict:
        """Analyze page with Gemini multimodal API"""
        try:
            # 画像をGemini用に準備
            import PIL.Image
            import io
            image = PIL.Image.open(io.BytesIO(screenshot))
            
            # マルチモーダルプロンプト
            prompt = f"""
            あなたは優秀なQAエンジニアです。以下のウェブページを詳細に分析し、バグや問題を見つけてください。

            URL: {url}
            タイトル: {title}

            分析項目：
            1. レイアウトの崩れ（要素の重なり、配置の問題）
            2. テキストの読みにくさ（フォントサイズ、色のコントラスト）
            3. ボタンやリンクの問題（クリックできない、小さすぎる）
            4. フォームの問題（ラベルがない、バリデーションエラー）
            5. 画像の問題（表示されない、altテキストがない）
            6. レスポンシブデザインの問題
            7. 一般的なUI/UXの問題

            見つかった問題を以下のJSON形式で報告してください：
            {{
                "issues": [
                    {{
                        "type": "問題の種類",
                        "description": "詳細な説明",
                        "severity": "high/medium/low",
                        "element": "問題のある要素",
                        "visual": true/false
                    }}
                ]
            }}
            
            HTMLコンテンツの一部:
            {content[:2000]}
            """
            
            # Gemini APIを呼び出し
            response = self.model.generate_content([prompt, image])
            
            # レスポンスをパース
            try:
                # JSONブロックを抽出
                text = response.text
                start = text.find('{')
                end = text.rfind('}') + 1
                if start >= 0 and end > start:
                    json_str = text[start:end]
                    result = json.loads(json_str)
                else:
                    result = {"issues": []}
            except:
                # パースできない場合は、テキストから問題を抽出
                result = self._extract_issues_from_text(response.text)
            
            logger.info(f"Gemini analysis found {len(result.get('issues', []))} issues")
            return result
            
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            return {"issues": []}
    
    def _extract_issues_from_text(self, text: str) -> Dict:
        """テキストから問題を抽出（フォールバック）"""
        issues = []
        lines = text.split('\n')
        
        current_issue = None
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # 問題の開始を検出
            if any(keyword in line.lower() for keyword in ['問題', 'エラー', 'issue', 'error', 'bug']):
                if current_issue:
                    issues.append(current_issue)
                current_issue = {
                    "type": "unknown",
                    "description": line,
                    "severity": "medium",
                    "visual": True
                }
            elif current_issue and line:
                # 既存の問題に詳細を追加
                current_issue["description"] += " " + line
        
        if current_issue:
            issues.append(current_issue)
        
        return {"issues": issues}
    
    def _test_interactive_elements(self, page, url: str) -> List[Dict]:
        """Test interactive elements with enhanced checks"""
        bugs = []
        
        # ボタンのテスト
        buttons = page.query_selector_all('button, input[type="submit"], input[type="button"]')
        for i, button in enumerate(buttons[:30]):  # 最大30個のボタンをテスト
            try:
                # ボタンが表示されているか確認
                if not button.is_visible():
                    continue
                
                # クリック可能か確認
                button_text = button.text_content() or button.get_attribute('value') or f"Button {i+1}"
                
                # ボタンをクリック
                button.click(timeout=5000)
                time.sleep(0.5)
                
                # エラーが表示されたか確認
                error_elements = page.query_selector_all('.error, .alert-danger, [role="alert"]')
                if error_elements:
                    bug = {
                        "type": "interaction_error",
                        "error_message": f"ボタン '{button_text}' クリック後にエラーが表示されました",
                        "url": url,
                        "severity": "medium",
                        "element": button_text
                    }
                    bugs.append(bug)
                    self._add_bug(bug)
                    
            except Exception as e:
                if "timeout" not in str(e).lower():
                    bug = {
                        "type": "interaction_error",
                        "error_message": f"ボタンのクリックに失敗: {str(e)}",
                        "url": url,
                        "severity": "high",
                        "element": button_text if 'button_text' in locals() else f"Button {i+1}"
                    }
                    bugs.append(bug)
                    self._add_bug(bug)
        
        # フォームのテスト
        forms = page.query_selector_all('form')
        for form in forms[:15]:  # 最大15個のフォームをテスト
            try:
                # 必須フィールドの確認
                required_inputs = form.query_selector_all('input[required], select[required], textarea[required]')
                for inp in required_inputs:
                    if not inp.get_attribute('aria-label') and not form.query_selector(f'label[for="{inp.get_attribute("id")}"]'):
                        bug = {
                            "type": "accessibility",
                            "error_message": "必須フィールドにラベルがありません",
                            "url": url,
                            "severity": "medium",
                            "element": inp.get_attribute('name') or 'unnamed input'
                        }
                        bugs.append(bug)
                        self._add_bug(bug)
                        
            except Exception as e:
                logger.warning(f"Error testing form: {e}")
        
        return bugs
    
    def _check_accessibility_enhanced(self, page, url: str) -> List[Dict]:
        """Enhanced accessibility checks"""
        bugs = []
        
        # 画像のaltテキストチェック
        images = page.query_selector_all('img')
        for img in images:
            if not img.get_attribute('alt'):
                src = img.get_attribute('src') or 'unknown'
                bug = {
                    "type": "accessibility",
                    "error_message": "画像にalt属性がありません",
                    "url": url,
                    "severity": "medium",
                    "element": src
                }
                bugs.append(bug)
                self._add_bug(bug)
        
        # 見出しの階層チェック
        headings = page.query_selector_all('h1, h2, h3, h4, h5, h6')
        prev_level = 0
        for heading in headings:
            level = int(heading.tag_name[1])
            if prev_level > 0 and level > prev_level + 1:
                bug = {
                    "type": "accessibility",
                    "error_message": f"見出しレベルがスキップされています (h{prev_level} → h{level})",
                    "url": url,
                    "severity": "low",
                    "element": heading.text_content()[:50]
                }
                bugs.append(bug)
                self._add_bug(bug)
            prev_level = level
        
        # コントラスト比のチェック（簡易版）
        elements_with_text = page.query_selector_all('p, span, div, a, button')
        for elem in elements_with_text[:50]:  # 最大50要素をチェック
            try:
                color = elem.evaluate('el => window.getComputedStyle(el).color')
                bg_color = elem.evaluate('el => window.getComputedStyle(el).backgroundColor')
                
                # 透明な背景の場合はスキップ
                if bg_color == 'rgba(0, 0, 0, 0)':
                    continue
                    
                # ここで本来はコントラスト比を計算すべきだが、簡易的にチェック
                if color == bg_color:
                    bug = {
                        "type": "accessibility",
                        "error_message": "テキストと背景が同じ色です",
                        "url": url,
                        "severity": "high",
                        "element": elem.text_content()[:50] if elem.text_content() else 'unknown'
                    }
                    bugs.append(bug)
                    self._add_bug(bug)
                    
            except Exception as e:
                pass
        
        return bugs
    
    def _check_performance(self, page, url: str) -> List[Dict]:
        """Check performance issues"""
        bugs = []
        
        try:
            # ページロード時間を測定
            metrics = page.evaluate('''() => {
                const perf = window.performance;
                return {
                    loadTime: perf.timing.loadEventEnd - perf.timing.navigationStart,
                    domContentLoaded: perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart,
                    resources: perf.getEntriesByType('resource').length
                };
            }''')
            
            # ロード時間が長い場合
            if metrics['loadTime'] > 5000:
                bug = {
                    "type": "performance",
                    "error_message": f"ページロード時間が長すぎます ({metrics['loadTime']}ms)",
                    "url": url,
                    "severity": "medium"
                }
                bugs.append(bug)
                self._add_bug(bug)
            
            # リソース数が多い場合
            if metrics['resources'] > 100:
                bug = {
                    "type": "performance",
                    "error_message": f"リソース数が多すぎます ({metrics['resources']}個)",
                    "url": url,
                    "severity": "low"
                }
                bugs.append(bug)
                self._add_bug(bug)
                
        except Exception as e:
            logger.warning(f"Performance check failed: {e}")
        
        return bugs
    
    def _extract_links(self, page, base_url: str) -> List[str]:
        """Extract links from the same domain"""
        links = []
        base_domain = urlparse(base_url).netloc
        
        try:
            anchors = page.query_selector_all('a[href]')
            for anchor in anchors[:100]:  # 最大100リンク
                href = anchor.get_attribute('href')
                if href:
                    # 相対URLを絶対URLに変換
                    absolute_url = urljoin(base_url, href)
                    parsed = urlparse(absolute_url)
                    
                    # 同一ドメインのHTTP/HTTPSリンクのみ
                    if parsed.netloc == base_domain and parsed.scheme in ['http', 'https']:
                        # フラグメント（#）を除去
                        clean_url = absolute_url.split('#')[0]
                        if clean_url not in self.visited_urls and clean_url not in links:
                            links.append(clean_url)
                            
        except Exception as e:
            logger.warning(f"Error extracting links: {e}")
        
        return links
    
    def _add_bug(self, bug: Dict):
        """Thread-safe bug addition"""
        with self.lock:
            self.bugs_found.append(bug)
    
    def _log_to_session(self, session_id: str, level: str, message: str, metadata: Dict = None, screenshot: bytes = None):
        """Log to TestSessionLog table with optional screenshot"""
        try:
            # Prismaの代わりに直接SQLを使用
            import psycopg2
            db_url = os.environ.get('DATABASE_ROOT_URL', '')
            if '127.0.0.1' in db_url or 'localhost' in db_url:
                db_url = db_url.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal')
            
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            # スクリーンショットをbase64でエンコード
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
    
    def _wait_for_any_complete(self, futures: List, timeout: float = None) -> Tuple[Set, List]:
        """Wait for any future to complete and return completed and pending futures"""
        done = set()
        pending = list(futures)
        
        if not futures:
            return done, pending
        
        # as_completedを使って最初に完了したものを取得
        try:
            for future in as_completed(futures, timeout=timeout):
                done.add(future)
                pending.remove(future)
                break  # 最初の1つだけ処理
        except TimeoutError:
            pass
        
        return done, pending
    
    def _is_same_domain(self, base_url: str, target_url: str) -> bool:
        """Check if two URLs are from the same domain"""
        try:
            base_domain = urlparse(base_url).netloc
            target_domain = urlparse(target_url).netloc
            return base_domain == target_domain
        except:
            return False