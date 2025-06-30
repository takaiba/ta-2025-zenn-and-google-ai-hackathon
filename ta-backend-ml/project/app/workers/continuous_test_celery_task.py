import logging
from celery import shared_task
from typing import Dict, Optional
from .continuous_test_executor import ContinuousTestExecutor
from prisma import Prisma

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='app.workers.continuous_test_celery_task.execute_continuous_test')
def execute_continuous_test_task(self, session_id: str, url: str, loop_count: Optional[int] = None) -> Dict:
    """
    Celery task for executing continuous test (10 loops)
    既存のCeleryワーカーで実行される
    """
    try:
        logger.info(f"Starting continuous test task for session {session_id}")
        
        # Prismaクライアントを初期化
        prisma = Prisma()
        
        # 連続テスト実行エンジンを初期化
        executor = ContinuousTestExecutor(prisma)
        
        # テスト実行
        result = executor.execute_continuous_test(session_id, url, loop_count)
        
        logger.info(f"Continuous test completed for session {session_id}")
        return result
        
    except Exception as e:
        logger.error(f"Continuous test task failed for session {session_id}: {e}")
        
        # Celeryのタスク失敗として記録
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(e),
                'session_id': session_id,
                'url': url
            }
        )
        raise


@shared_task(bind=True, name='app.workers.continuous_test_celery_task.execute_enhanced_test')
def execute_enhanced_test_task(self, session_id: str, mode: str, url: str, scenario_id: Optional[str] = None) -> Dict:
    """
    Celery task for executing enhanced test
    既存のCeleryワーカーで実行される
    """
    try:
        logger.info(f"Starting enhanced test task for session {session_id}")
        
        # Prismaクライアントを初期化
        prisma = Prisma()
        
        # 拡張テスト実行エンジンを初期化
        from .test_executor_enhanced import EnhancedTestExecutor
        executor = EnhancedTestExecutor(prisma)
        
        # テスト実行
        result = executor.execute(session_id, mode, url, scenario_id)
        
        logger.info(f"Enhanced test completed for session {session_id}")
        return result
        
    except Exception as e:
        logger.error(f"Enhanced test task failed for session {session_id}: {e}")
        
        # Celeryのタスク失敗として記録
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(e),
                'session_id': session_id,
                'mode': mode,
                'url': url
            }
        )
        raise