import asyncio
import json
import logging
import websockets
from websockets.server import WebSocketServerProtocol
from .test_runner import realtime_runner

logger = logging.getLogger(__name__)


class WebSocketTestServer:
    """WebSocketベースのリアルタイムテスト管理サーバー"""
    
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.server = None
        
    async def start_server(self):
        """WebSocketサーバーを開始"""
        logger.info(f"Starting WebSocket server on {self.host}:{self.port}")
        
        self.server = await websockets.serve(
            self.handle_client,
            self.host,
            self.port,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=10
        )
        
        logger.info(f"WebSocket server started on ws://{self.host}:{self.port}")
        
    async def stop_server(self):
        """WebSocketサーバーを停止"""
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            logger.info("WebSocket server stopped")
    
    async def handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """WebSocketクライアントからの接続を処理"""
        client_addr = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        logger.info(f"New WebSocket connection from {client_addr}")
        
        # クライアントをリアルタイムランナーに登録
        await realtime_runner.add_websocket_client(websocket)
        
        try:
            # 接続確認メッセージを送信
            await websocket.send(json.dumps({
                'type': 'connection_established',
                'message': 'WebSocket接続が確立されました',
                'timestamp': asyncio.get_event_loop().time()
            }))
            
            # クライアントからのメッセージを処理
            async for message in websocket:
                await self.handle_message(websocket, message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket connection closed: {client_addr}")
        except Exception as e:
            logger.error(f"WebSocket error for {client_addr}: {e}")
        finally:
            # クライアントを登録解除
            await realtime_runner.remove_websocket_client(websocket)
    
    async def handle_message(self, websocket: WebSocketServerProtocol, message: str):
        """クライアントからのメッセージを処理"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'start_continuous_test':
                await self.handle_start_test(websocket, data)
            elif message_type == 'get_session_status':
                await self.handle_get_status(websocket, data)
            elif message_type == 'stop_session':
                await self.handle_stop_session(websocket, data)
            elif message_type == 'get_session_logs':
                await self.handle_get_logs(websocket, data)
            elif message_type == 'get_session_bugs':
                await self.handle_get_bugs(websocket, data)
            elif message_type == 'ping':
                await websocket.send(json.dumps({'type': 'pong'}))
            else:
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
                
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await websocket.send(json.dumps({
                'type': 'error',
                'message': f'Server error: {str(e)}'
            }))
    
    async def handle_start_test(self, websocket: WebSocketServerProtocol, data: dict):
        """テスト開始リクエストを処理"""
        session_id = data.get('session_id')
        url = data.get('url')
        loop_count = data.get('loop_count', 10)
        
        if not session_id or not url:
            await websocket.send(json.dumps({
                'type': 'error',
                'message': 'session_id and url are required'
            }))
            return
        
        # テストを開始
        result = await realtime_runner.start_continuous_test(session_id, url, loop_count)
        
        # 結果をクライアントに送信
        await websocket.send(json.dumps({
            'type': 'test_start_response',
            'data': result
        }))
    
    async def handle_get_status(self, websocket: WebSocketServerProtocol, data: dict):
        """セッションステータス取得リクエストを処理"""
        session_id = data.get('session_id')
        
        if not session_id:
            await websocket.send(json.dumps({
                'type': 'error',
                'message': 'session_id is required'
            }))
            return
        
        status = await realtime_runner.get_session_status(session_id)
        
        await websocket.send(json.dumps({
            'type': 'session_status',
            'data': status
        }))
    
    async def handle_stop_session(self, websocket: WebSocketServerProtocol, data: dict):
        """セッション停止リクエストを処理"""
        session_id = data.get('session_id')
        
        if not session_id:
            await websocket.send(json.dumps({
                'type': 'error',
                'message': 'session_id is required'
            }))
            return
        
        result = await realtime_runner.stop_session(session_id)
        
        await websocket.send(json.dumps({
            'type': 'session_stop_response',
            'data': result
        }))
    
    async def handle_get_logs(self, websocket: WebSocketServerProtocol, data: dict):
        """セッションログ取得リクエストを処理"""
        session_id = data.get('session_id')
        limit = data.get('limit', 50)
        
        if not session_id:
            await websocket.send(json.dumps({
                'type': 'error',
                'message': 'session_id is required'
            }))
            return
        
        logs = await realtime_runner.get_session_logs(session_id, limit)
        
        await websocket.send(json.dumps({
            'type': 'session_logs',
            'data': {
                'session_id': session_id,
                'logs': logs
            }
        }))
    
    async def handle_get_bugs(self, websocket: WebSocketServerProtocol, data: dict):
        """セッションバグ取得リクエストを処理"""
        session_id = data.get('session_id')
        
        if not session_id:
            await websocket.send(json.dumps({
                'type': 'error',
                'message': 'session_id is required'
            }))
            return
        
        bugs = await realtime_runner.get_session_bugs(session_id)
        
        await websocket.send(json.dumps({
            'type': 'session_bugs',
            'data': {
                'session_id': session_id,
                'bugs': bugs
            }
        }))


# グローバルサーバーインスタンス
websocket_server = WebSocketTestServer()


async def start_websocket_server():
    """WebSocketサーバーを開始（スタンドアロン実行用）"""
    await websocket_server.start_server()
    
    try:
        # サーバーを永続的に実行
        await asyncio.Future()  # 永久に実行
    except KeyboardInterrupt:
        logger.info("Shutting down WebSocket server...")
    finally:
        await websocket_server.stop_server()


if __name__ == "__main__":
    # スタンドアロンでWebSocketサーバーを実行
    asyncio.run(start_websocket_server())