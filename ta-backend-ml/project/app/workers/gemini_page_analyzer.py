import json
import logging
import base64
from typing import Dict, List, Optional, Tuple
import google.generativeai as genai
import PIL.Image
import io

logger = logging.getLogger(__name__)


class GeminiPageAnalyzer:
    """Gemini APIを使用してページを分析し、次の操作を生成するクラス"""
    
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
    def analyze_page_and_generate_actions(self, 
                                        url: str,
                                        screenshot: bytes,
                                        page_content: str,
                                        page_title: str,
                                        current_state: Dict) -> Dict:
        """ページを分析し、次に実行すべきアクションを生成"""
        try:
            # 画像をGemini用に準備
            image = PIL.Image.open(io.BytesIO(screenshot))
            
            # マルチモーダルプロンプト
            prompt = f"""
            あなたは優秀なQAエンジニアです。ウェブページを分析し、次に実行すべきテストアクションを提案してください。

            現在のページ情報:
            - URL: {url}
            - タイトル: {page_title}
            - 訪問済みページ数: {current_state.get('pages_visited', 0)}
            - 現在の深さ: {current_state.get('depth', 0)}

            以下の観点でページを分析してください：
            1. ログインフォームがある場合は、ログイン操作を提案
            2. ボタンやリンクのクリック操作
            3. フォームへの入力操作
            4. ドロップダウンやチェックボックスの操作
            5. タブやアコーディオンの展開
            6. スクロールが必要な要素の検出

            次のJSON形式で、実行すべきアクションのリストを返してください：
            {{
                "actions": [
                    {{
                        "type": "click|fill|select|scroll|wait",
                        "selector": "CSSセレクタまたはテキスト",
                        "value": "入力値（fillの場合）",
                        "description": "アクションの説明",
                        "priority": "high|medium|low"
                    }}
                ],
                "navigation_suggestions": [
                    {{
                        "url": "推奨される次のURL",
                        "reason": "なぜこのURLを訪問すべきか"
                    }}
                ],
                "issues_found": [
                    {{
                        "type": "バグの種類",
                        "description": "詳細な説明",
                        "severity": "high|medium|low",
                        "element": "問題のある要素"
                    }}
                ]
            }}

            重要な指示:
            - ログインフォームを見つけたら、必ず高優先度でログイン操作を提案してください
            - テスト用の一般的な認証情報を使用: (例: test@example.com / password123)
            - 重要な機能（購入、送信、削除など）は慎重に扱ってください
            - 同じアクションを繰り返さないように注意してください

            HTMLコンテンツの一部:
            {page_content[:3000]}
            """
            
            # Gemini APIを呼び出し
            response = self.model.generate_content([prompt, image])
            
            # レスポンスをパース
            result = self._parse_gemini_response(response.text)
            
            logger.info(f"Gemini generated {len(result.get('actions', []))} actions")
            return result
            
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            return {
                "actions": [],
                "navigation_suggestions": [],
                "issues_found": []
            }
    
    def _parse_gemini_response(self, text: str) -> Dict:
        """Geminiのレスポンスをパース"""
        try:
            # JSONブロックを抽出
            start = text.find('{')
            end = text.rfind('}') + 1
            if start >= 0 and end > start:
                json_str = text[start:end]
                return json.loads(json_str)
        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {e}")
        
        # フォールバック
        return {
            "actions": [],
            "navigation_suggestions": [],
            "issues_found": []
        }


class PlaywrightActionExecutor:
    """Geminiが生成したアクションをPlaywrightで実行するクラス"""
    
    def __init__(self):
        self.action_handlers = {
            'click': self._handle_click,
            'fill': self._handle_fill,
            'select': self._handle_select,
            'scroll': self._handle_scroll,
            'wait': self._handle_wait
        }
    
    def execute_actions(self, page, actions: List[Dict]) -> List[Dict]:
        """アクションリストを実行"""
        results = []
        
        for action in actions:
            try:
                action_type = action.get('type', 'click')
                handler = self.action_handlers.get(action_type)
                
                if handler:
                    result = handler(page, action)
                    results.append({
                        'action': action,
                        'success': result['success'],
                        'error': result.get('error'),
                        'screenshot': result.get('screenshot')
                    })
                else:
                    logger.warning(f"Unknown action type: {action_type}")
                    
            except Exception as e:
                logger.error(f"Action execution failed: {e}")
                results.append({
                    'action': action,
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    def _handle_click(self, page, action: Dict) -> Dict:
        """クリックアクションを処理"""
        try:
            selector = action.get('selector', '')
            
            # テキストベースのセレクタの場合
            if not selector.startswith(('.', '#', '[')) and not selector.startswith('//'):
                # テキストを含む要素を探す
                element = page.locator(f'text="{selector}"').first
            else:
                element = page.locator(selector).first
            
            # 要素が見つかったらクリック
            if element:
                element.wait_for(state='visible', timeout=5000)
                element.click()
                
                # クリック後のスクリーンショット
                screenshot = page.screenshot()
                
                return {
                    'success': True,
                    'screenshot': base64.b64encode(screenshot).decode('utf-8')
                }
            else:
                return {
                    'success': False,
                    'error': f"Element not found: {selector}"
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _handle_fill(self, page, action: Dict) -> Dict:
        """入力アクションを処理"""
        try:
            selector = action.get('selector', '')
            value = action.get('value', '')
            
            element = page.locator(selector).first
            if element:
                element.wait_for(state='visible', timeout=5000)
                element.fill(value)
                
                return {'success': True}
            else:
                return {
                    'success': False,
                    'error': f"Input element not found: {selector}"
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _handle_select(self, page, action: Dict) -> Dict:
        """選択アクションを処理"""
        try:
            selector = action.get('selector', '')
            value = action.get('value', '')
            
            element = page.locator(selector).first
            if element:
                element.wait_for(state='visible', timeout=5000)
                element.select_option(value)
                
                return {'success': True}
            else:
                return {
                    'success': False,
                    'error': f"Select element not found: {selector}"
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _handle_scroll(self, page, action: Dict) -> Dict:
        """スクロールアクションを処理"""
        try:
            selector = action.get('selector')
            
            if selector:
                # 特定の要素までスクロール
                element = page.locator(selector).first
                if element:
                    element.scroll_into_view_if_needed()
            else:
                # ページ全体をスクロール
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            
            return {'success': True}
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _handle_wait(self, page, action: Dict) -> Dict:
        """待機アクションを処理"""
        try:
            duration = action.get('value', 1000)  # デフォルト1秒
            page.wait_for_timeout(duration)
            
            return {'success': True}
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }