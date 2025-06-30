import json
import logging
import os
from typing import Dict, List
import google.generativeai as genai
from prisma import Prisma
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)


class ScenarioGenerator:
    """Generate test scenarios using AI based on user descriptions"""
    
    def __init__(self, prisma: Prisma):
        self.prisma = prisma
        # Gemini APIの設定
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    def generate(self, project_id: str, description: str, url: str) -> Dict:
        """
        Generate test scenario from natural language description
        
        Args:
            project_id: Project ID
            description: Natural language description of the test flow
            url: Target URL
            
        Returns:
            Generated scenario information
        """
        logger.info(f"Generating scenario for project {project_id}")
        
        # Analyze the page structure
        page_analysis = self._analyze_page_structure(url)
        
        # Generate scenario steps using AI
        scenario = self._generate_scenario_with_ai(
            description=description,
            url=url,
            page_analysis=page_analysis
        )
        
        # Validate and refine steps
        validated_steps = self._validate_steps(url, scenario["steps"])
        
        return {
            "name": scenario["name"],
            "steps": validated_steps,
            "expected_results": scenario["expected_results"],
            "tags": scenario.get("tags", []),
            "estimated_duration": self._estimate_duration(validated_steps)
        }
    
    def _analyze_page_structure(self, url: str) -> Dict:
        """Analyze page structure to help with scenario generation"""
        logger.info(f"Analyzing page structure for {url}")
        
        page_info = {
            "url": url,
            "elements": [],
            "forms": [],
            "links": []
        }
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(url, wait_until='networkidle')
                
                # Find interactive elements
                buttons = page.query_selector_all('button')
                for button in buttons:
                    page_info["elements"].append({
                        "type": "button",
                        "text": button.text_content(),
                        "selector": self._get_selector(button)
                    })
                
                # Find forms
                forms = page.query_selector_all('form')
                for form in forms:
                    form_info = {
                        "selector": self._get_selector(form),
                        "inputs": []
                    }
                    
                    inputs = form.query_selector_all('input, select, textarea')
                    for input_elem in inputs:
                        form_info["inputs"].append({
                            "type": input_elem.get_attribute('type') or 'text',
                            "name": input_elem.get_attribute('name'),
                            "id": input_elem.get_attribute('id'),
                            "placeholder": input_elem.get_attribute('placeholder')
                        })
                    
                    page_info["forms"].append(form_info)
                
                # Find navigation links
                links = page.query_selector_all('a[href]')
                for link in links[:20]:  # Limit to 20 links
                    href = link.get_attribute('href')
                    if href and not href.startswith('#'):
                        page_info["links"].append({
                            "text": link.text_content(),
                            "href": href,
                            "selector": self._get_selector(link)
                        })
                
                browser.close()
                
        except Exception as e:
            logger.error(f"Page analysis failed: {e}")
        
        return page_info
    
    def _generate_scenario_with_ai(self, description: str, url: str, page_analysis: Dict) -> Dict:
        """Use AI to generate scenario steps"""
        try:
            prompt = f"""
            あなたはテストシナリオを作成するQAエンジニアです。
            
            以下の説明に基づいてテストシナリオを生成してください：
            説明: "{description}"
            
            対象URL: {url}
            
            ページ分析結果:
            - インタラクティブ要素数: {len(page_analysis['elements'])}
            - フォーム数: {len(page_analysis['forms'])}
            - リンク数: {len(page_analysis['links'])}
            
            利用可能な要素: {json.dumps(page_analysis['elements'][:10])}
            
            以下を含むテストシナリオをJSON形式で生成してください：
            1. 説明的な名前（最大100文字）
            2. ステップバイステップのアクション（以下の形式）：
               - action: click/fill/navigate/wait/assert
               - target: CSSセレクタまたは要素識別子
               - value: (fillアクションまたはアサーション用)
               - description: 人間が読める説明
            3. 各主要マイルストーンの期待される結果
            4. 分類用の関連タグ
            
            JSONレスポンスには以下のキーを含めてください: name, steps, expected_results, tags
            
            ステップ形式の例:
            {{
                "action": "click",
                "target": "button[type='submit']",
                "value": null,
                "description": "送信ボタンをクリック"
            }}
            """
            
            response = self.model.generate_content(prompt)
            
            # GeminiのレスポンスからJSON部分を抽出
            response_text = response.text
            # JSONブロックを探す
            import re
            json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
            if json_match:
                scenario = json.loads(json_match.group())
            else:
                # JSONが見つからない場合は、テキストから情報を抽出
                scenario = self._extract_scenario_from_text(response_text, description, url)
            
            # Ensure proper structure
            if "steps" not in scenario:
                scenario["steps"] = []
            if "expected_results" not in scenario:
                scenario["expected_results"] = []
            if "name" not in scenario:
                scenario["name"] = description[:100]
            if "tags" not in scenario:
                scenario["tags"] = ["generated"]
            
            return scenario
            
        except Exception as e:
            logger.error(f"AI scenario generation failed: {e}")
            # Fallback to basic scenario
            return {
                "name": description[:100],
                "steps": [
                    {
                        "action": "navigate",
                        "target": "",
                        "value": url,
                        "description": f"Navigate to {url}"
                    }
                ],
                "expected_results": ["Page loads successfully"],
                "tags": ["generated", "basic"]
            }
    
    def _extract_scenario_from_text(self, text: str, description: str, url: str) -> Dict:
        """テキストレスポンスからシナリオ情報を抽出"""
        scenario = {
            "name": description[:100],
            "steps": [],
            "expected_results": [],
            "tags": ["generated"]
        }
        
        lines = text.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # セクションの検出
            if '名前' in line or 'name' in line.lower():
                current_section = 'name'
                if ':' in line:
                    scenario["name"] = line.split(':', 1)[-1].strip()[:100]
            elif 'ステップ' in line or 'step' in line.lower():
                current_section = 'steps'
            elif '期待' in line or 'expected' in line.lower():
                current_section = 'expected'
            elif 'タグ' in line or 'tag' in line.lower():
                current_section = 'tags'
            else:
                # 各セクションのコンテンツを処理
                if current_section == 'steps' and (line.startswith('-') or line.startswith('*') or line[0].isdigit()):
                    # ステップの解析
                    step_text = line.lstrip('-*0123456789. ')
                    step = {
                        "action": "click",  # デフォルト
                        "target": "",
                        "value": "",
                        "description": step_text
                    }
                    
                    # アクションタイプの検出
                    if 'クリック' in step_text or 'click' in step_text.lower():
                        step["action"] = "click"
                    elif '入力' in step_text or 'fill' in step_text.lower() or 'type' in step_text.lower():
                        step["action"] = "fill"
                    elif 'ナビゲート' in step_text or 'navigate' in step_text.lower() or 'go to' in step_text.lower():
                        step["action"] = "navigate"
                    elif '待' in step_text or 'wait' in step_text.lower():
                        step["action"] = "wait"
                    elif '確認' in step_text or 'assert' in step_text.lower() or 'verify' in step_text.lower():
                        step["action"] = "assert"
                    
                    scenario["steps"].append(step)
                    
                elif current_section == 'expected' and line:
                    scenario["expected_results"].append(line.lstrip('-* '))
                    
                elif current_section == 'tags' and line:
                    tags = line.split(',')
                    scenario["tags"] = [tag.strip() for tag in tags]
        
        # 最低限のステップを確保
        if not scenario["steps"]:
            scenario["steps"] = [{
                "action": "navigate",
                "target": "",
                "value": url,
                "description": f"Navigate to {url}"
            }]
        
        return scenario
    
    def _validate_steps(self, url: str, steps: List[Dict]) -> List[Dict]:
        """Validate and refine generated steps"""
        validated_steps = []
        
        # Always start with navigation if not present
        if not steps or steps[0]["action"] != "navigate":
            validated_steps.append({
                "action": "navigate",
                "target": "",
                "value": url,
                "description": f"Navigate to {url}"
            })
        
        for step in steps:
            # Ensure all required fields
            validated_step = {
                "action": step.get("action", "wait"),
                "target": step.get("target", ""),
                "value": step.get("value", ""),
                "description": step.get("description", "")
            }
            
            # Validate action types
            valid_actions = ["click", "fill", "navigate", "wait", "assert", "hover", "select"]
            if validated_step["action"] not in valid_actions:
                validated_step["action"] = "wait"
                validated_step["value"] = "1"
            
            # Clean up selectors
            if validated_step["target"]:
                validated_step["target"] = self._clean_selector(validated_step["target"])
            
            validated_steps.append(validated_step)
        
        return validated_steps
    
    def _get_selector(self, element) -> str:
        """Get a reliable selector for an element"""
        # Try ID first
        elem_id = element.get_attribute('id')
        if elem_id:
            return f"#{elem_id}"
        
        # Try unique class
        classes = element.get_attribute('class')
        if classes:
            class_list = classes.split()
            if len(class_list) == 1:
                return f".{class_list[0]}"
        
        # Try data attributes
        data_attrs = element.evaluate("el => Object.keys(el.dataset)")
        if data_attrs:
            return f"[data-{data_attrs[0]}='{element.get_attribute(f'data-{data_attrs[0]}')}']"
        
        # Fallback to tag name
        return element.evaluate("el => el.tagName.toLowerCase()")
    
    def _clean_selector(self, selector: str) -> str:
        """Clean and validate CSS selector"""
        # Remove any quotes around the selector
        selector = selector.strip('"\'')
        
        # Basic validation
        if not selector:
            return "body"
        
        # Ensure it's a valid CSS selector format
        invalid_chars = ['<', '>', '{', '}', '|']
        for char in invalid_chars:
            selector = selector.replace(char, '')
        
        return selector
    
    def _estimate_duration(self, steps: List[Dict]) -> int:
        """Estimate scenario duration in seconds"""
        duration = 0
        
        for step in steps:
            if step["action"] == "navigate":
                duration += 5  # Page load time
            elif step["action"] == "fill":
                duration += 2  # Typing time
            elif step["action"] == "click":
                duration += 1  # Click and response
            elif step["action"] == "wait":
                try:
                    duration += float(step["value"])
                except:
                    duration += 1
            else:
                duration += 1  # Default action time
        
        return duration