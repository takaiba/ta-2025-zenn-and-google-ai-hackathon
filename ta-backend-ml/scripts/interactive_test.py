#!/usr/bin/env python3
"""
QA³ Backend ML - インタラクティブテストツール
"""

import os
import sys
import json
import time
import base64
import requests
from datetime import datetime
from typing import Dict, Any, Optional

# カラー出力用のANSIコード
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'

class QA3Tester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session_id = None
        self.job_ids = []
        
    def print_header(self, text: str):
        """ヘッダーを表示"""
        print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    
    def print_success(self, text: str):
        """成功メッセージを表示"""
        print(f"{Colors.GREEN}✓ {text}{Colors.END}")
    
    def print_error(self, text: str):
        """エラーメッセージを表示"""
        print(f"{Colors.RED}✗ {text}{Colors.END}")
    
    def print_info(self, text: str):
        """情報メッセージを表示"""
        print(f"{Colors.CYAN}ℹ {text}{Colors.END}")
    
    def print_json(self, data: Dict[str, Any]):
        """JSONデータを整形して表示"""
        print(json.dumps(data, indent=2, ensure_ascii=False))
    
    def check_health(self) -> bool:
        """ヘルスチェック"""
        self.print_header("Health Check")
        
        try:
            # Web API
            response = requests.get(f"{self.base_url}/api/healthcheck")
            if response.status_code == 200:
                self.print_success("Web API is healthy")
                self.print_json(response.json())
            else:
                self.print_error(f"Web API returned status {response.status_code}")
                return False
            
            # Redis (via Docker)
            redis_check = os.system("docker exec ta-backend-ml-redis redis-cli ping > /dev/null 2>&1")
            if redis_check == 0:
                self.print_success("Redis is healthy")
            else:
                self.print_error("Redis is not responding")
                return False
            
            # Flower
            try:
                flower_response = requests.get("http://localhost:5555/api/workers", timeout=5)
                if flower_response.status_code == 200:
                    self.print_success("Flower is healthy")
                    workers = flower_response.json()
                    self.print_info(f"Active workers: {len(workers)}")
                else:
                    self.print_error("Flower is not responding properly")
            except:
                self.print_error("Flower is not accessible")
            
            return True
            
        except requests.exceptions.ConnectionError:
            self.print_error("Cannot connect to the API. Is the server running?")
            return False
        except Exception as e:
            self.print_error(f"Unexpected error: {e}")
            return False
    
    def test_execute(self, project_id: str = None, url: str = None) -> Optional[str]:
        """テスト実行をリクエスト"""
        self.print_header("Test Execution")
        
        if not project_id:
            project_id = f"test-project-{int(time.time())}"
        if not url:
            url = input(f"{Colors.YELLOW}Enter URL to test (default: https://example.com): {Colors.END}").strip()
            if not url:
                url = "https://example.com"
        
        payload = {
            "project_id": project_id,
            "test_config_id": f"config-{project_id}",
            "account_id": "test-account-1",
            "mode": "omakase",
            "url": url
        }
        
        self.print_info("Request payload:")
        self.print_json(payload)
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/test/execute",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.session_id = data.get("session_id")
                self.print_success(f"Test execution queued: {self.session_id}")
                self.print_json(data)
                return self.session_id
            else:
                self.print_error(f"Failed with status {response.status_code}")
                self.print_json(response.json())
                return None
                
        except Exception as e:
            self.print_error(f"Error: {e}")
            return None
    
    def check_status(self, session_id: str = None) -> Dict[str, Any]:
        """ステータスを確認"""
        self.print_header("Status Check")
        
        if not session_id:
            session_id = self.session_id
        
        if not session_id:
            self.print_error("No session ID available")
            return {}
        
        try:
            response = requests.get(f"{self.base_url}/api/v1/test/status/{session_id}")
            
            if response.status_code == 200:
                data = response.json()
                status = data.get("status", "unknown")
                
                if status == "completed":
                    self.print_success(f"Status: {status}")
                elif status == "failed":
                    self.print_error(f"Status: {status}")
                else:
                    self.print_info(f"Status: {status}")
                
                self.print_json(data)
                return data
            else:
                self.print_error(f"Failed with status {response.status_code}")
                return {}
                
        except Exception as e:
            self.print_error(f"Error: {e}")
            return {}
    
    def test_bug_analysis(self) -> Optional[str]:
        """バグ分析をテスト"""
        self.print_header("Bug Analysis")
        
        # ダミーのスクリーンショット（1x1の透明PNG）
        dummy_screenshot = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        payload = {
            "test_session_id": self.session_id or "test-session-1",
            "screenshot": dummy_screenshot,
            "page_url": "https://example.com/test-page",
            "error_message": "Button click failed - Element not found"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/bug/analyze",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                job_id = data.get("job_id")
                self.job_ids.append(job_id)
                self.print_success(f"Bug analysis queued: {job_id}")
                self.print_json(data)
                return job_id
            else:
                self.print_error(f"Failed with status {response.status_code}")
                self.print_json(response.json())
                return None
                
        except Exception as e:
            self.print_error(f"Error: {e}")
            return None
    
    def test_report_generation(self, format_type: str = "json") -> Optional[str]:
        """レポート生成をテスト"""
        self.print_header("Report Generation")
        
        payload = {
            "test_session_id": self.session_id or "test-session-1",
            "format": format_type
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/report/generate",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                job_id = data.get("job_id")
                self.job_ids.append(job_id)
                self.print_success(f"Report generation queued: {job_id}")
                self.print_json(data)
                return job_id
            else:
                self.print_error(f"Failed with status {response.status_code}")
                self.print_json(response.json())
                return None
                
        except Exception as e:
            self.print_error(f"Error: {e}")
            return None
    
    def test_scenario_generation(self) -> Optional[str]:
        """シナリオ生成をテスト"""
        self.print_header("Scenario Generation")
        
        description = input(f"{Colors.YELLOW}Enter scenario description (or press Enter for default): {Colors.END}").strip()
        if not description:
            description = "ユーザーがログインして、商品を検索し、カートに追加して購入する"
        
        payload = {
            "project_id": "test-project-1",
            "description": description,
            "url": "https://example.com"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/scenario/generate",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                job_id = data.get("job_id")
                self.job_ids.append(job_id)
                self.print_success(f"Scenario generation queued: {job_id}")
                self.print_json(data)
                return job_id
            else:
                self.print_error(f"Failed with status {response.status_code}")
                self.print_json(response.json())
                return None
                
        except Exception as e:
            self.print_error(f"Error: {e}")
            return None
    
    def monitor_jobs(self):
        """ジョブの進行状況をモニター"""
        self.print_header("Job Monitoring")
        
        if not self.session_id and not self.job_ids:
            self.print_error("No jobs to monitor")
            return
        
        print(f"{Colors.YELLOW}Monitoring jobs... Press Ctrl+C to stop{Colors.END}")
        
        try:
            while True:
                # セッションステータスをチェック
                if self.session_id:
                    print(f"\n{Colors.BOLD}Session: {self.session_id}{Colors.END}")
                    self.check_status()
                
                # ジョブステータスをチェック（Redis経由）
                for job_id in self.job_ids:
                    print(f"\n{Colors.BOLD}Job: {job_id}{Colors.END}")
                    # Redisから直接ステータスを取得
                    cmd = f'docker exec ta-backend-ml-redis redis-cli GET "job:{job_id}"'
                    os.system(cmd)
                
                time.sleep(5)
                
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}Monitoring stopped{Colors.END}")
    
    def run_interactive(self):
        """インタラクティブモード"""
        self.print_header("QA³ Backend ML Interactive Tester")
        
        # ヘルスチェック
        if not self.check_health():
            self.print_error("Health check failed. Please ensure all services are running.")
            return
        
        while True:
            print(f"\n{Colors.BOLD}{Colors.YELLOW}Menu:{Colors.END}")
            print("1. Execute Test")
            print("2. Check Status")
            print("3. Test Bug Analysis")
            print("4. Generate Report")
            print("5. Generate Scenario")
            print("6. Monitor Jobs")
            print("7. Run All Tests")
            print("8. Health Check")
            print("0. Exit")
            
            choice = input(f"\n{Colors.CYAN}Select option: {Colors.END}").strip()
            
            if choice == "1":
                self.test_execute()
            elif choice == "2":
                if self.session_id:
                    self.check_status()
                else:
                    session_id = input(f"{Colors.YELLOW}Enter session ID: {Colors.END}").strip()
                    if session_id:
                        self.check_status(session_id)
            elif choice == "3":
                self.test_bug_analysis()
            elif choice == "4":
                format_type = input(f"{Colors.YELLOW}Enter format (pdf/html/json): {Colors.END}").strip() or "json"
                self.test_report_generation(format_type)
            elif choice == "5":
                self.test_scenario_generation()
            elif choice == "6":
                self.monitor_jobs()
            elif choice == "7":
                self.run_all_tests()
            elif choice == "8":
                self.check_health()
            elif choice == "0":
                print(f"{Colors.GREEN}Goodbye!{Colors.END}")
                break
            else:
                self.print_error("Invalid option")
    
    def run_all_tests(self):
        """すべてのテストを実行"""
        self.print_header("Running All Tests")
        
        # 1. テスト実行
        session_id = self.test_execute()
        if session_id:
            time.sleep(2)
            self.check_status()
        
        # 2. バグ分析
        time.sleep(1)
        self.test_bug_analysis()
        
        # 3. レポート生成
        time.sleep(1)
        self.test_report_generation()
        
        # 4. シナリオ生成
        time.sleep(1)
        self.test_scenario_generation()
        
        self.print_success("All tests completed!")
        self.print_info(f"Session ID: {self.session_id}")
        self.print_info(f"Job IDs: {', '.join(self.job_ids)}")

def main():
    """メイン関数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="QA³ Backend ML Interactive Tester")
    parser.add_argument("--url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--health", action="store_true", help="Health check only")
    
    args = parser.parse_args()
    
    tester = QA3Tester(args.url)
    
    if args.health:
        tester.check_health()
    elif args.all:
        tester.check_health()
        tester.run_all_tests()
    else:
        tester.run_interactive()

if __name__ == "__main__":
    main()