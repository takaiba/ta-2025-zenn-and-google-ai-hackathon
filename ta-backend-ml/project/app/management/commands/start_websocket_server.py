import asyncio
import logging
from django.core.management.base import BaseCommand
from app.realtime.websocket_server import websocket_server

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Start the WebSocket server for realtime test monitoring'

    def add_arguments(self, parser):
        parser.add_argument(
            '--host',
            type=str,
            default='localhost',
            help='Host to bind the WebSocket server to'
        )
        parser.add_argument(
            '--port',
            type=int,
            default=8765,
            help='Port to bind the WebSocket server to'
        )

    def handle(self, *args, **options):
        host = options['host']
        port = options['port']
        
        self.stdout.write(
            self.style.SUCCESS(f'Starting WebSocket server on {host}:{port}')
        )
        
        # WebSocketサーバーの設定を更新
        websocket_server.host = host
        websocket_server.port = port
        
        try:
            # asyncioイベントループを開始
            asyncio.run(self._run_server())
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.SUCCESS('WebSocket server stopped')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'WebSocket server error: {e}')
            )
    
    async def _run_server(self):
        """WebSocketサーバーを非同期で実行"""
        await websocket_server.start_server()
        
        self.stdout.write(
            self.style.SUCCESS('WebSocket server is running. Press Ctrl+C to stop.')
        )
        
        try:
            # サーバーを永続的に実行
            await asyncio.Future()  # 永久に実行
        finally:
            await websocket_server.stop_server()