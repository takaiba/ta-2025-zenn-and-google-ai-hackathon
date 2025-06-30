import time
import json
import logging
import os
from datetime import datetime
from playwright.sync_api import sync_playwright
from typing import Dict, List, Optional
import google.generativeai as genai
from prisma import Prisma

logger = logging.getLogger(__name__)


class TestExecutor:
    """Execute automated tests using Playwright and AI"""
    
    def __init__(self, prisma: Prisma):
        self.prisma = prisma
        # Gemini APIの設定
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')  # 最新の高速モデル
    
    def execute(self, session_id: str, mode: str, url: str, scenario_id: Optional[str] = None) -> Dict:
        """
        Execute test based on mode
        
        Args:
            session_id: Test session ID
            mode: Test mode (omakase, scenario, hybrid)
            url: Target URL to test
            scenario_id: Optional scenario ID for scenario/hybrid modes
            
        Returns:
            Test execution results
        """
        start_time = time.time()
        
        if mode == "omakase":
            result = self._execute_omakase_mode(session_id, url)
        elif mode == "scenario":
            if not scenario_id:
                raise ValueError("scenario_id is required for scenario mode")
            result = self._execute_scenario_mode(session_id, url, scenario_id)
        elif mode == "hybrid":
            if not scenario_id:
                raise ValueError("scenario_id is required for hybrid mode")
            result = self._execute_hybrid_mode(session_id, url, scenario_id)
        else:
            raise ValueError(f"Invalid mode: {mode}")
        
        duration = int(time.time() - start_time)
        result["duration"] = duration
        
        return result
    
    def _execute_omakase_mode(self, session_id: str, url: str) -> Dict:
        """Execute autonomous testing mode"""
        logger.info(f"Executing omakase mode for session {session_id}")
        
        bugs_found = []
        pages_scanned = 0
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='QA3-Bot/1.0'
            )
            page = context.new_page()
            
            try:
                # Navigate to the URL
                page.goto(url, wait_until='networkidle')
                pages_scanned += 1
                
                # Get page content and analyze with AI
                page_content = page.content()
                screenshot = page.screenshot()
                
                # Analyze page for potential issues
                analysis = self._analyze_page_with_ai(url, page_content, screenshot)
                
                # Find interactive elements
                interactive_elements = self._find_interactive_elements(page)
                
                # Test each interactive element
                for element in interactive_elements[:10]:  # Limit to 10 elements for MVP
                    try:
                        bug = self._test_element(page, element)
                        if bug:
                            bugs_found.append(bug)
                    except Exception as e:
                        logger.warning(f"Error testing element: {e}")
                
                # Check for accessibility issues
                accessibility_issues = self._check_accessibility(page)
                bugs_found.extend(accessibility_issues)
                
                # Save test results
                for i, bug in enumerate(bugs_found):
                    self.prisma.testresult.create(
                        data={
                            "testSessionId": session_id,
                            "testName": f"Omakase Test {i+1}",
                            "status": "failed" if bug else "passed",
                            "errorMessage": bug.get("error_message"),
                            "screenshot": bug.get("screenshot"),
                            "executionTime": bug.get("execution_time", 0)
                        }
                    )
                
            finally:
                browser.close()
        
        return {
            "pages_scanned": pages_scanned,
            "bugs_found": len(bugs_found),
            "test_coverage": 0.7,  # Simplified for MVP
            "bugs": bugs_found
        }
    
    def _execute_scenario_mode(self, session_id: str, url: str, scenario_id: str) -> Dict:
        """Execute predefined scenario testing"""
        logger.info(f"Executing scenario mode for session {session_id}")
        
        # Get scenario from database
        scenario = self.prisma.testscenario.find_unique(where={"id": scenario_id})
        if not scenario:
            raise ValueError(f"Scenario {scenario_id} not found")
        
        steps = json.loads(scenario.steps)
        bugs_found = []
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080}
            )
            page = context.new_page()
            
            try:
                page.goto(url, wait_until='networkidle')
                
                # Execute each step
                for i, step in enumerate(steps):
                    try:
                        result = self._execute_step(page, step)
                        
                        # Save test result
                        self.prisma.testresult.create(
                            data={
                                "testSessionId": session_id,
                                "testName": f"Step {i+1}: {step.get('description', '')}",
                                "status": "passed" if result["success"] else "failed",
                                "errorMessage": result.get("error"),
                                "screenshot": result.get("screenshot"),
                                "executionTime": result.get("execution_time", 0)
                            }
                        )
                        
                        if not result["success"]:
                            bugs_found.append({
                                "step": i + 1,
                                "description": step.get('description'),
                                "error": result.get("error"),
                                "screenshot": result.get("screenshot")
                            })
                    except Exception as e:
                        logger.error(f"Error executing step {i+1}: {e}")
                        bugs_found.append({
                            "step": i + 1,
                            "description": step.get('description'),
                            "error": str(e)
                        })
                
            finally:
                browser.close()
        
        return {
            "pages_scanned": 1,
            "bugs_found": len(bugs_found),
            "test_coverage": 1.0,  # 100% for scenario mode
            "bugs": bugs_found
        }
    
    def _execute_hybrid_mode(self, session_id: str, url: str, scenario_id: str) -> Dict:
        """Execute hybrid testing (scenario + autonomous)"""
        logger.info(f"Executing hybrid mode for session {session_id}")
        
        # First execute scenario
        scenario_result = self._execute_scenario_mode(session_id, url, scenario_id)
        
        # Then execute autonomous testing
        omakase_result = self._execute_omakase_mode(session_id, url)
        
        # Combine results
        return {
            "pages_scanned": scenario_result["pages_scanned"] + omakase_result["pages_scanned"],
            "bugs_found": scenario_result["bugs_found"] + omakase_result["bugs_found"],
            "test_coverage": 0.85,  # Average of both modes
            "bugs": scenario_result["bugs"] + omakase_result["bugs"]
        }
    
    def _analyze_page_with_ai(self, url: str, content: str, screenshot: bytes) -> Dict:
        """Use Gemini AI to analyze page for potential issues"""
        try:
            # Gemini APIでの分析
            prompt = f"""
            あなたはウェブページのバグや問題を分析するQAエンジニアです。
            
            このウェブページを分析して、潜在的なバグや問題を見つけてください：
            URL: {url}
            
            以下の点を確認してください：
            1. レイアウトの崩れ
            2. コンテンツの欠落
            3. JavaScriptエラー
            4. アクセシビリティの問題
            5. パフォーマンスの問題
            
            ページコンテンツのプレビュー: {content[:1000]}
            
            見つかった問題を簡潔にリストアップしてください。
            """
            
            response = self.model.generate_content(prompt)
            
            return {
                "analysis": response.text,
                "potential_issues": self._extract_issues_from_analysis(response.text)
            }
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return {"analysis": "AI analysis failed", "potential_issues": []}
    
    def _extract_issues_from_analysis(self, analysis_text: str) -> List[str]:
        """分析結果から問題点を抽出"""
        issues = []
        lines = analysis_text.split('\n')
        for line in lines:
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('*') or line.startswith('•')):
                issues.append(line.lstrip('-*• '))
        return issues
    
    def _find_interactive_elements(self, page) -> List[Dict]:
        """Find interactive elements on the page"""
        elements = []
        
        # Find buttons
        buttons = page.query_selector_all('button')
        for button in buttons:
            elements.append({
                "type": "button",
                "selector": button,
                "text": button.text_content()
            })
        
        # Find links
        links = page.query_selector_all('a[href]')
        for link in links:
            elements.append({
                "type": "link",
                "selector": link,
                "text": link.text_content()
            })
        
        # Find form inputs
        inputs = page.query_selector_all('input, select, textarea')
        for input_elem in inputs:
            elements.append({
                "type": "input",
                "selector": input_elem,
                "name": input_elem.get_attribute('name')
            })
        
        return elements
    
    def _test_element(self, page, element: Dict) -> Optional[Dict]:
        """Test an individual element"""
        try:
            if element["type"] == "button":
                element["selector"].click()
                # Check for errors
                time.sleep(1)
                
            elif element["type"] == "link":
                href = element["selector"].get_attribute('href')
                if href and not href.startswith('#'):
                    response = page.goto(href, wait_until='networkidle')
                    if response.status >= 400:
                        return {
                            "type": "broken_link",
                            "error_message": f"Link returns {response.status}",
                            "element": element["text"],
                            "screenshot": page.screenshot()
                        }
                    page.go_back()
                    
            elif element["type"] == "input":
                # Test form validation
                element["selector"].fill("test")
                
        except Exception as e:
            return {
                "type": "interaction_error",
                "error_message": str(e),
                "element": element.get("text", element.get("name", "unknown")),
                "screenshot": page.screenshot()
            }
        
        return None
    
    def _check_accessibility(self, page) -> List[Dict]:
        """Check for accessibility issues"""
        issues = []
        
        # Check for images without alt text
        images = page.query_selector_all('img:not([alt])')
        for img in images:
            issues.append({
                "type": "accessibility",
                "error_message": "Image missing alt text",
                "element": img.get_attribute('src'),
                "severity": "medium"
            })
        
        # Check for missing labels
        inputs = page.query_selector_all('input:not([aria-label]):not([id])')
        for input_elem in inputs:
            issues.append({
                "type": "accessibility",
                "error_message": "Input missing label",
                "element": input_elem.get_attribute('name'),
                "severity": "medium"
            })
        
        return issues
    
    def _execute_step(self, page, step: Dict) -> Dict:
        """Execute a single test step"""
        start_time = time.time()
        
        try:
            action = step.get("action")
            target = step.get("target")
            value = step.get("value")
            
            if action == "click":
                page.click(target)
            elif action == "fill":
                page.fill(target, value)
            elif action == "navigate":
                page.goto(value, wait_until='networkidle')
            elif action == "wait":
                time.sleep(float(value))
            elif action == "assert":
                # Simple assertion
                if "visible" in value:
                    page.wait_for_selector(target, state="visible")
                elif "text" in value:
                    element = page.query_selector(target)
                    actual_text = element.text_content()
                    expected_text = value.split(":")[-1].strip()
                    assert expected_text in actual_text
            
            return {
                "success": True,
                "execution_time": time.time() - start_time,
                "screenshot": page.screenshot()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "execution_time": time.time() - start_time,
                "screenshot": page.screenshot()
            }