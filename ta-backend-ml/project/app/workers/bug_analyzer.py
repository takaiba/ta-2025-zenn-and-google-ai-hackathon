import json
import logging
import base64
import os
from typing import Dict, List, Optional
import google.generativeai as genai
from prisma import Prisma
from datetime import datetime

logger = logging.getLogger(__name__)


class BugAnalyzer:
    """Analyze bugs using AI and generate detailed bug reports"""
    
    def __init__(self, prisma: Prisma):
        self.prisma = prisma
        # Gemini APIの設定
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    def analyze(self, test_session_id: str, screenshot: str, page_url: str, 
                error_message: str, stack_trace: Optional[str] = None) -> Dict:
        """
        Analyze a bug and generate detailed information
        
        Args:
            test_session_id: Test session ID
            screenshot: Base64 encoded screenshot
            page_url: URL where the bug occurred
            error_message: Error message
            stack_trace: Optional stack trace
            
        Returns:
            Analyzed bug information
        """
        logger.info(f"Analyzing bug for session {test_session_id}")
        
        # Get test session info
        test_session = self.prisma.testsession.find_unique(
            where={"id": test_session_id},
            include={"project": True}
        )
        
        if not test_session:
            raise ValueError(f"Test session {test_session_id} not found")
        
        # Analyze bug with AI
        analysis = self._analyze_with_ai(
            page_url=page_url,
            error_message=error_message,
            stack_trace=stack_trace,
            screenshot=screenshot
        )
        
        # Determine severity
        severity = self._determine_severity(analysis)
        
        # Generate reproduction steps
        reproduction_steps = self._generate_reproduction_steps(
            page_url=page_url,
            error_message=error_message,
            analysis=analysis
        )
        
        # Get environment information
        environment = self._get_environment_info(test_session)
        
        return {
            "project_id": test_session.projectId,
            "title": analysis["title"],
            "description": analysis["description"],
            "severity": severity,
            "reproduction_steps": reproduction_steps,
            "expected_behavior": analysis["expected_behavior"],
            "actual_behavior": analysis["actual_behavior"],
            "environment": environment,
            "category": analysis.get("category", "functional"),
            "suggested_fix": analysis.get("suggested_fix", "")
        }
    
    def _analyze_with_ai(self, page_url: str, error_message: str, 
                        stack_trace: Optional[str], screenshot: str) -> Dict:
        """Use Gemini AI to analyze the bug"""
        try:
            prompt = f"""
            あなたはウェブアプリケーションのバグを分析するQAエンジニアです。
            
            自動テスト中に発見されたこのバグを分析してください：
            
            URL: {page_url}
            エラーメッセージ: {error_message}
            スタックトレース: {stack_trace or '利用不可'}
            
            この情報に基づいて、以下を提供してください：
            1. バグの簡潔なタイトル（最大100文字）
            2. 問題の詳細な説明
            3. 期待される動作
            4. 実際に観察された動作
            5. バグのカテゴリ（functional, ui, performance, security, accessibility）
            6. 可能であれば修正案
            
            JSON形式で以下のキーを持つレスポンスを返してください：
            {{
                "title": "バグのタイトル",
                "description": "詳細な説明",
                "expected_behavior": "期待される動作",
                "actual_behavior": "実際の動作",
                "category": "カテゴリ",
                "suggested_fix": "修正案"
            }}
            """
            
            response = self.model.generate_content(prompt)
            
            # GeminiのレスポンスからJSON部分を抽出
            response_text = response.text
            # JSONブロックを探す
            import re
            json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # JSONが見つからない場合は、テキストから情報を抽出
                return self._extract_bug_info_from_text(response_text)
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            # Fallback to basic analysis
            return {
                "title": f"Error on {page_url}",
                "description": error_message,
                "expected_behavior": "Page should load without errors",
                "actual_behavior": f"Error occurred: {error_message}",
                "category": "functional",
                "suggested_fix": "Investigate the error and fix the underlying issue"
            }
    
    def _extract_bug_info_from_text(self, text: str) -> Dict:
        """テキストレスポンスからバグ情報を抽出"""
        # 基本的な抽出ロジック
        lines = text.split('\n')
        info = {
            "title": "Bug found",
            "description": "",
            "expected_behavior": "",
            "actual_behavior": "",
            "category": "functional",
            "suggested_fix": ""
        }
        
        for line in lines:
            line_lower = line.lower()
            if 'タイトル' in line or 'title' in line_lower:
                info["title"] = line.split(':', 1)[-1].strip()[:100]
            elif '説明' in line or 'description' in line_lower:
                info["description"] = line.split(':', 1)[-1].strip()
            elif '期待' in line or 'expected' in line_lower:
                info["expected_behavior"] = line.split(':', 1)[-1].strip()
            elif '実際' in line or 'actual' in line_lower:
                info["actual_behavior"] = line.split(':', 1)[-1].strip()
            elif 'カテゴリ' in line or 'category' in line_lower:
                info["category"] = line.split(':', 1)[-1].strip()
            elif '修正' in line or 'fix' in line_lower:
                info["suggested_fix"] = line.split(':', 1)[-1].strip()
        
        return info
    
    def _determine_severity(self, analysis: Dict) -> str:
        """Determine bug severity based on analysis"""
        category = analysis.get("category", "functional")
        description = analysis.get("description", "").lower()
        
        # Critical severity indicators
        critical_keywords = ["security", "data loss", "crash", "payment", "authentication"]
        if any(keyword in description for keyword in critical_keywords) or category == "security":
            return "critical"
        
        # High severity indicators
        high_keywords = ["broken", "not working", "error", "fail"]
        if any(keyword in description for keyword in high_keywords):
            return "high"
        
        # Low severity indicators
        low_keywords = ["typo", "spelling", "minor", "cosmetic"]
        if any(keyword in description for keyword in low_keywords):
            return "low"
        
        # Default to medium
        return "medium"
    
    def _generate_reproduction_steps(self, page_url: str, error_message: str, analysis: Dict) -> List[Dict]:
        """Generate steps to reproduce the bug"""
        steps = [
            {
                "step": 1,
                "action": "Navigate to URL",
                "expected": "Page loads successfully",
                "actual": f"Navigate to {page_url}"
            }
        ]
        
        # Add context-specific steps based on the error
        if "click" in error_message.lower():
            steps.append({
                "step": 2,
                "action": "Click on the element",
                "expected": "Action completes successfully",
                "actual": "Error occurs when clicking"
            })
        elif "form" in error_message.lower() or "input" in error_message.lower():
            steps.append({
                "step": 2,
                "action": "Fill in the form",
                "expected": "Form accepts input",
                "actual": "Error occurs with form interaction"
            })
        
        steps.append({
            "step": len(steps) + 1,
            "action": "Observe the result",
            "expected": analysis["expected_behavior"],
            "actual": analysis["actual_behavior"]
        })
        
        return steps
    
    def _get_environment_info(self, test_session) -> Dict:
        """Get environment information from test session"""
        test_config = self.prisma.testconfig.find_unique(
            where={"id": test_session.testConfigId}
        )
        
        return {
            "browser": test_config.browser if test_config else "chrome",
            "viewport": {
                "width": test_config.viewportWidth if test_config else 1920,
                "height": test_config.viewportHeight if test_config else 1080
            },
            "test_mode": test_config.mode if test_config else "omakase",
            "timestamp": datetime.utcnow().isoformat()
        }