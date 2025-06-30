"""
同期的なJobQueue処理
Celeryワーカー内でのasyncio問題を回避
"""
import json
import logging
from datetime import datetime
from typing import Dict, Any

from celery import shared_task
import psycopg2
from psycopg2.extras import RealDictCursor

from app.workers.test_executor_enhanced import EnhancedTestExecutor
from app.workers.bug_analyzer import BugAnalyzer
from app.workers.report_generator import ReportGenerator
from app.workers.scenario_generator import ScenarioGenerator

logger = logging.getLogger(__name__)


def log_to_session(cursor, session_id, log_level, message, metadata=None):
    """TestSessionLogテーブルにログを記録"""
    try:
        cursor.execute("""
            INSERT INTO "TestSessionLog" (id, test_session_id, log_level, message, metadata, created_at)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, NOW())
        """, (session_id, log_level, message, json.dumps(metadata or {})))
    except Exception as e:
        logger.error(f"Failed to log to session: {e}")


def get_db_connection():
    """データベース接続を取得"""
    import os
    db_url = os.environ.get('DATABASE_ROOT_URL', '')
    
    # Docker内からホストのPostgreSQLに接続する場合の処理
    if 'host.docker.internal' in db_url:
        pass  # そのまま使用
    elif '127.0.0.1' in db_url or 'localhost' in db_url:
        db_url = db_url.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal')
    
    return psycopg2.connect(db_url)


@shared_task(name="app.job_queue_sync.process_job_queue")
def process_job_queue():
    """
    JobQueueを同期的に処理
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 保留中のジョブを取得
        cursor.execute("""
            SELECT * FROM "JobQueue" 
            WHERE status = 'pending' AND attempts < 3
            ORDER BY priority ASC, created_at ASC
            LIMIT 10
        """)
        jobs = cursor.fetchall()
        
        logger.info(f"Found {len(jobs)} pending jobs")
        processed_count = 0
        
        if jobs:
            logger.info(f"Processing jobs: {[job['id'] for job in jobs]}")
        
        for job in jobs:
            try:
                # ジョブをprocessing状態に更新
                logger.info(f"Starting to process job {job['id']} (type: {job['type']}, attempt: {job['attempts'] + 1})")
                cursor.execute("""
                    UPDATE "JobQueue" 
                    SET status = 'processing', started_at = NOW(), attempts = attempts + 1
                    WHERE id = %s
                """, (job['id'],))
                conn.commit()
                
                # ジョブタイプに応じた処理
                if job['type'] == 'test_execution':
                    logger.info(f"Processing test execution job {job['id']}")
                    process_test_execution(job, cursor, conn)
                    processed_count += 1
                    logger.info(f"Successfully processed job {job['id']}")
                else:
                    logger.warning(f"Unknown job type: {job['type']}")
                    
            except Exception as e:
                logger.error(f"Error processing job {job['id']}: {str(e)}")
                # エラーの場合、failedまたはpendingに戻す
                is_final = job['attempts'] >= 2
                cursor.execute("""
                    UPDATE "JobQueue" 
                    SET status = %s, error = %s, completed_at = %s
                    WHERE id = %s
                """, (
                    'failed' if is_final else 'pending',
                    str(e),
                    datetime.now() if is_final else None,
                    job['id']
                ))
                conn.commit()
        
        cursor.close()
        conn.close()
        
        return processed_count
        
    except Exception as e:
        logger.error(f"Error in process_job_queue: {str(e)}")
        return 0


def process_test_execution(job, cursor, conn):
    """テスト実行ジョブを処理"""
    logger.info(f"Processing test execution job: {job['id']}")
    payload = job['payload'] if isinstance(job['payload'], dict) else json.loads(job['payload'])
    logger.info(f"Job payload: {json.dumps(payload)}")
    
    session_id = payload.get('sessionId') or payload.get('session_id')
    test_config_id = payload.get('testConfigId') or payload.get('test_config_id')
    logger.info(f"Session ID: {session_id}, Test Config ID: {test_config_id}")
    
    if not session_id:
        raise ValueError("No session ID found in payload")
    
    # TestConfigからURLを取得
    cursor.execute("""
        SELECT url, mode FROM "TestConfig" WHERE id = %s
    """, (test_config_id,))
    test_config = cursor.fetchone()
    
    if not test_config:
        raise ValueError(f"TestConfig not found: {test_config_id}")
    
    url = payload.get('url') or test_config['url']
    mode = payload.get('mode') or test_config['mode'] or 'omakase'
    
    # TestSessionを更新
    logger.info(f"Updating TestSession {session_id} to 'running' status")
    cursor.execute("""
        UPDATE "TestSession" 
        SET status = 'running', started_at = NOW()
        WHERE id = %s
    """, (session_id,))
    conn.commit()
    
    # ログを記録
    log_to_session(cursor, session_id, 'info', 'テスト実行を開始します', {
        'job_id': job['id'],
        'test_config_id': test_config_id,
        'url': url,
        'mode': mode
    })
    conn.commit()
    
    try:
        logger.info(f"Starting test execution for session {session_id}")
        log_to_session(cursor, session_id, 'info', 'テスト環境をセットアップ中...', None)
        conn.commit()
        
        # Prismaの代わりに直接データベース操作を使用
        from prisma import Prisma
        import asyncio
        import time
        
        # 簡易的な同期実行
        def run_test():
            # 新しいプロセスでテストを実行
            import subprocess
            import sys
            
            code = f'''
import sys
sys.path.insert(0, "/app/project")
from app.workers.test_executor_enhanced import EnhancedTestExecutor
from prisma import Prisma
import asyncio

async def main():
    prisma = Prisma()
    await prisma.connect()
    executor = EnhancedTestExecutor(prisma)
    result = executor.execute("{session_id}", "{mode}", "{url}")
    await prisma.disconnect()
    return result

result = asyncio.run(main())
print(json.dumps(result))
'''
            
            proc = subprocess.run(
                [sys.executable, '-c', code],
                capture_output=True,
                text=True,
                cwd="/app/project"
            )
            
            if proc.returncode != 0:
                raise Exception(f"Test execution failed: {proc.stderr}")
            
            return json.loads(proc.stdout)
        
        # 実際のテスト実行を有効化
        result = run_test()
        
        logger.info(f"テスト完了: {json.dumps(result)}")
        log_to_session(cursor, session_id, 'info', 'テストが完了しました', result)
        conn.commit()
        
        # TestSessionを更新
        logger.info(f"Updating TestSession {session_id} with results")
        cursor.execute("""
            UPDATE "TestSession" 
            SET status = 'completed', 
                completed_at = NOW(),
                pages_scanned = %s,
                bugs_found = %s,
                test_coverage = %s,
                duration = %s
            WHERE id = %s
        """, (
            result.get('pages_scanned', 0),
            result.get('bugs_found', 0),
            result.get('test_coverage', 0.0),
            result.get('duration', 0),
            session_id
        ))
        
        # JobQueueを完了に更新
        logger.info(f"Updating JobQueue {job['id']} to completed")
        cursor.execute("""
            UPDATE "JobQueue" 
            SET status = 'completed', 
                completed_at = NOW(),
                result = %s
            WHERE id = %s
        """, (json.dumps(result), job['id']))
        
        log_to_session(cursor, session_id, 'info', 'ジョブ処理が完了しました', {
            'job_id': job['id'],
            'result': result
        })
        conn.commit()
        
        logger.info(f"Test execution completed for session {session_id}")
        
    except Exception as e:
        # エラーの場合
        logger.error(f"Error in test execution: {str(e)}", exc_info=True)
        
        log_to_session(cursor, session_id, 'error', f'テスト実行中にエラーが発生しました: {str(e)}', {
            'error_type': type(e).__name__,
            'job_id': job['id']
        })
        conn.commit()
        
        cursor.execute("""
            UPDATE "TestSession" 
            SET status = 'failed', 
                completed_at = NOW(),
                error_message = %s
            WHERE id = %s
        """, (str(e), session_id))
        conn.commit()
        raise