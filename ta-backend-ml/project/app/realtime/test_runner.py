import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, Optional, List
from concurrent.futures import ThreadPoolExecutor
from ..workers.continuous_test_executor import ContinuousTestExecutor
from ..workers.test_executor_enhanced import EnhancedTestExecutor
from prisma import Prisma
import websockets
import threading

logger = logging.getLogger(__name__)


class RealtimeTestRunner:
    """リアルタイムでテスト実行を管理し、進捗をWebSocketで配信するクラス"""
    
    def __init__(self):
        self.prisma = Prisma()
        self.continuous_executor = ContinuousTestExecutor(self.prisma)
        self.enhanced_executor = EnhancedTestExecutor(self.prisma)
        self.active_sessions = {}
        self.websocket_clients = set()
        
    async def start_continuous_test(self, session_id: str, url: str, loop_count: Optional[int] = None) -> Dict:
        """連続テストをリアルタイムで開始"""
        logger.info(f"Starting realtime continuous test for session {session_id}")
        
        # セッション状態を記録
        self.active_sessions[session_id] = {
            'status': 'running',
            'start_time': time.time(),
            'url': url,
            'loop_count': loop_count or 10,
            'current_loop': 0,
            'bugs_found': 0,
            'pages_scanned': 0
        }
        
        # WebSocketで開始通知
        await self._broadcast_update(session_id, 'test_started', {
            'session_id': session_id,
            'url': url,
            'loop_count': loop_count or 10,
            'message': '連続テスト実行を開始しました'
        })
        
        try:
            # バックグラウンドでテスト実行
            executor = ThreadPoolExecutor(max_workers=1)
            future = executor.submit(self._run_continuous_test_sync, session_id, url, loop_count)
            
            # 進捗監視を並行実行
            asyncio.create_task(self._monitor_test_progress(session_id, future))
            
            return {
                'status': 'started',
                'session_id': session_id,
                'message': 'リアルタイムテスト実行を開始しました'
            }
            
        except Exception as e:
            logger.error(f"Failed to start continuous test: {e}")
            self.active_sessions[session_id]['status'] = 'error'
            self.active_sessions[session_id]['error'] = str(e)
            
            await self._broadcast_update(session_id, 'test_error', {
                'session_id': session_id,
                'error': str(e),
                'message': 'テスト実行中にエラーが発生しました'
            })
            
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _run_continuous_test_sync(self, session_id: str, url: str, loop_count: Optional[int] = None) -> Dict:
        """同期的にテスト実行（別スレッドで実行）"""
        try:
            # カスタムContinuousTestExecutorを使用してループ進捗を監視
            return self.continuous_executor.execute_continuous_test(session_id, url, loop_count)
        except Exception as e:
            logger.error(f"Continuous test execution failed: {e}")
            raise
    
    async def _monitor_test_progress(self, session_id: str, future):
        """テスト進捗を監視してWebSocketで配信"""
        while not future.done():
            await asyncio.sleep(2)  # 2秒間隔で進捗をチェック
            
            # データベースから最新の進捗を取得
            try:
                await self.prisma.connect()
                
                # TestSessionLogから最新のログを取得
                logs = await self.prisma.testsessionlog.find_many(
                    where={
                        'testSessionId': session_id
                    },
                    order_by=[{'createdAt': 'desc'}],
                    take=5
                )
                
                # BugTicketの数を取得
                bug_count = await self.prisma.bugticket.count(
                    where={
                        'testSessionId': session_id
                    }
                )
                
                # TestResultの数を取得（ページスキャン数として使用）
                page_count = await self.prisma.testresult.count(
                    where={
                        'testSessionId': session_id
                    }
                )
                
                await self.prisma.disconnect()
                
                # セッション状態を更新
                if session_id in self.active_sessions:
                    self.active_sessions[session_id]['bugs_found'] = bug_count
                    self.active_sessions[session_id]['pages_scanned'] = page_count
                    
                    # 最新ログからループ情報を抽出
                    current_loop = 0
                    for log in logs:
                        if 'ループ' in log.message:
                            import re
                            match = re.search(r'ループ(\d+)', log.message)
                            if match:
                                current_loop = max(current_loop, int(match.group(1)))
                    
                    self.active_sessions[session_id]['current_loop'] = current_loop
                
                # WebSocketで進捗を配信
                await self._broadcast_update(session_id, 'test_progress', {
                    'session_id': session_id,
                    'current_loop': current_loop,
                    'total_loops': self.active_sessions[session_id]['loop_count'],
                    'bugs_found': bug_count,
                    'pages_scanned': page_count,
                    'recent_logs': [
                        {
                            'level': log.logLevel,
                            'message': log.message,
                            'timestamp': log.createdAt.isoformat(),
                            'has_screenshot': bool(log.screenshot)
                        } for log in logs
                    ]
                })
                
            except Exception as e:
                logger.error(f"Failed to get progress for session {session_id}: {e}")
        
        # テスト完了後の処理
        try:
            result = future.result()
            self.active_sessions[session_id]['status'] = 'completed'
            self.active_sessions[session_id]['result'] = result
            
            await self._broadcast_update(session_id, 'test_completed', {
                'session_id': session_id,
                'result': result,
                'message': 'テスト実行が完了しました'
            })
            
        except Exception as e:
            logger.error(f"Test execution failed: {e}")
            self.active_sessions[session_id]['status'] = 'error'
            self.active_sessions[session_id]['error'] = str(e)
            
            await self._broadcast_update(session_id, 'test_error', {
                'session_id': session_id,
                'error': str(e),
                'message': 'テスト実行中にエラーが発生しました'
            })
    
    async def get_session_status(self, session_id: str) -> Dict:
        """セッションの現在のステータスを取得"""
        if session_id not in self.active_sessions:
            return {
                'status': 'not_found',
                'message': 'セッションが見つかりません'
            }
        
        session = self.active_sessions[session_id]
        
        # 実行時間を計算
        duration = int(time.time() - session['start_time'])
        
        return {
            'status': session['status'],
            'session_id': session_id,
            'url': session['url'],
            'loop_count': session['loop_count'],
            'current_loop': session.get('current_loop', 0),
            'bugs_found': session.get('bugs_found', 0),
            'pages_scanned': session.get('pages_scanned', 0),
            'duration': duration,
            'progress_percentage': min(100, (session.get('current_loop', 0) / session['loop_count']) * 100),
            'error': session.get('error'),
            'result': session.get('result')
        }
    
    async def stop_session(self, session_id: str) -> Dict:
        """テストセッションを停止"""
        if session_id not in self.active_sessions:
            return {
                'status': 'not_found',
                'message': 'セッションが見つかりません'
            }
        
        self.active_sessions[session_id]['status'] = 'stopped'
        
        await self._broadcast_update(session_id, 'test_stopped', {
            'session_id': session_id,
            'message': 'テスト実行が停止されました'
        })
        
        return {
            'status': 'stopped',
            'session_id': session_id,
            'message': 'テストセッションを停止しました'
        }
    
    async def add_websocket_client(self, websocket):
        """WebSocketクライアントを追加"""
        self.websocket_clients.add(websocket)
        logger.info(f"WebSocket client added. Total clients: {len(self.websocket_clients)}")
    
    async def remove_websocket_client(self, websocket):
        """WebSocketクライアントを削除"""
        self.websocket_clients.discard(websocket)
        logger.info(f"WebSocket client removed. Total clients: {len(self.websocket_clients)}")
    
    async def _broadcast_update(self, session_id: str, event_type: str, data: Dict):
        """全てのWebSocketクライアントに更新を配信"""
        if not self.websocket_clients:
            return
        
        message = {
            'type': event_type,
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        
        # 切断されたクライアントを記録
        disconnected_clients = set()
        
        for client in self.websocket_clients:
            try:
                await client.send(json.dumps(message))
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)
            except Exception as e:
                logger.error(f"Failed to send message to WebSocket client: {e}")
                disconnected_clients.add(client)
        
        # 切断されたクライアントを削除
        for client in disconnected_clients:
            self.websocket_clients.discard(client)
    
    async def get_session_logs(self, session_id: str, limit: int = 50) -> List[Dict]:
        """セッションのログを取得"""
        try:
            await self.prisma.connect()
            
            logs = await self.prisma.testsessionlog.find_many(
                where={
                    'testSessionId': session_id
                },
                order_by=[{'createdAt': 'desc'}],
                take=limit
            )
            
            await self.prisma.disconnect()
            
            return [
                {
                    'id': log.id,
                    'level': log.logLevel,
                    'message': log.message,
                    'metadata': json.loads(log.metadata) if log.metadata else {},
                    'has_screenshot': bool(log.screenshot),
                    'screenshot': log.screenshot if log.screenshot else None,
                    'timestamp': log.createdAt.isoformat()
                } for log in logs
            ]
            
        except Exception as e:
            logger.error(f"Failed to get session logs: {e}")
            return []
    
    async def get_session_bugs(self, session_id: str) -> List[Dict]:
        """セッションで発見されたバグを取得"""
        try:
            await self.prisma.connect()
            
            bugs = await self.prisma.bugticket.find_many(
                where={
                    'testSessionId': session_id
                },
                order_by=[{'createdAt': 'desc'}]
            )
            
            await self.prisma.disconnect()
            
            return [
                {
                    'id': bug.id,
                    'title': bug.title,
                    'description': bug.description,
                    'severity': bug.severity,
                    'bug_type': bug.bugType,
                    'affected_url': bug.affectedUrl,
                    'screenshot': bug.screenshot,
                    'created_at': bug.createdAt.isoformat()
                } for bug in bugs
            ]
            
        except Exception as e:
            logger.error(f"Failed to get session bugs: {e}")
            return []


# グローバルインスタンス
realtime_runner = RealtimeTestRunner()