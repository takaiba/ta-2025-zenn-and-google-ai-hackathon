import json
import logging
import base64
import os
import psycopg2
from datetime import datetime
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class ActivityLogger:
    """重要なアクションをActivityLogテーブルに記録するクラス"""
    
    def __init__(self):
        self.db_url = os.environ.get('DATABASE_ROOT_URL', '')
        if '127.0.0.1' in self.db_url or 'localhost' in self.db_url:
            self.db_url = self.db_url.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal')
    
    def log_activity(self, 
                    account_id: str,
                    action: str,
                    resource_type: str,
                    resource_id: str,
                    metadata: Optional[Dict] = None,
                    screenshot: Optional[bytes] = None):
        """ActivityLogにアクティビティを記録"""
        try:
            conn = psycopg2.connect(self.db_url)
            cursor = conn.cursor()
            
            # スクリーンショットをbase64でエンコード
            screenshot_b64 = None
            if screenshot:
                screenshot_b64 = base64.b64encode(screenshot).decode('utf-8')
            
            cursor.execute("""
                INSERT INTO "ActivityLog" (id, account_id, action, resource_type, resource_id, metadata, screenshot, created_at)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, NOW())
            """, (account_id, action, resource_type, resource_id, json.dumps(metadata or {}), screenshot_b64))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Activity logged: {action} for {resource_type} {resource_id}")
            
        except Exception as e:
            logger.error(f"Failed to log activity: {e}")
    
    def log_test_started(self, account_id: str, test_session_id: str, metadata: Dict = None, screenshot: bytes = None):
        """テスト開始のアクティビティをログ"""
        self.log_activity(
            account_id=account_id,
            action='test_started',
            resource_type='test_session',
            resource_id=test_session_id,
            metadata=metadata,
            screenshot=screenshot
        )
    
    def log_test_completed(self, account_id: str, test_session_id: str, metadata: Dict = None, screenshot: bytes = None):
        """テスト完了のアクティビティをログ"""
        self.log_activity(
            account_id=account_id,
            action='test_completed',
            resource_type='test_session',
            resource_id=test_session_id,
            metadata=metadata,
            screenshot=screenshot
        )
    
    def log_bug_reported(self, account_id: str, bug_ticket_id: str, metadata: Dict = None, screenshot: bytes = None):
        """バグ報告のアクティビティをログ"""
        self.log_activity(
            account_id=account_id,
            action='bug_reported',
            resource_type='bug_ticket',
            resource_id=bug_ticket_id,
            metadata=metadata,
            screenshot=screenshot
        )
    
    def log_project_created(self, account_id: str, project_id: str, metadata: Dict = None, screenshot: bytes = None):
        """プロジェクト作成のアクティビティをログ"""
        self.log_activity(
            account_id=account_id,
            action='project_created',
            resource_type='project',
            resource_id=project_id,
            metadata=metadata,
            screenshot=screenshot
        )