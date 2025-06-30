"""
JobQueueポーリング処理
データベースのJobQueueテーブルから未処理のジョブを取得して実行する
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from celery import shared_task
from prisma import Prisma

from app.workers.test_executor import TestExecutor
from app.workers.bug_analyzer import BugAnalyzer
from app.workers.report_generator import ReportGenerator
from app.workers.scenario_generator import ScenarioGenerator

logger = logging.getLogger(__name__)


class JobQueueProcessor:
    """JobQueueのジョブを処理するクラス"""
    
    def __init__(self):
        self.executors = {
            "test_execution": self._execute_test,
            "bug_analysis": self._analyze_bug,
            "report_generation": self._generate_report,
            "scenario_generation": self._generate_scenario
        }
    
    async def process_pending_jobs(self) -> int:
        """
        保留中のジョブを処理する
        
        Returns:
            処理したジョブの数
        """
        prisma = Prisma()
        await prisma.connect()
        
        try:
            # 保留中のジョブを取得
            jobs = await prisma.jobqueue.find_many(
                where={
                    "status": "pending",
                    "attempts": {"lt": 3}  # maxAttemptsより少ない
                },
                take=10  # 一度に処理するジョブの最大数
            )
            
            # 優先度とcreatedAtでソート
            jobs.sort(key=lambda x: (x.priority, x.createdAt))
            
            logger.info(f"Found {len(jobs)} pending jobs")
            
            processed_count = 0
            for job in jobs:
                try:
                    await self._process_single_job(prisma, job)
                    processed_count += 1
                except Exception as e:
                    logger.error(f"Failed to process job {job.id}: {str(e)}")
            
            return processed_count
            
        finally:
            await prisma.disconnect()
    
    async def _process_single_job(self, prisma: Prisma, job: Any) -> None:
        """単一のジョブを処理する"""
        logger.info(f"Processing job {job.id} of type {job.type}")
        logger.info(f"Job payload type: {type(job.payload)}, content: {job.payload}")
        
        # ジョブをprocessing状態に更新
        await prisma.jobqueue.update(
            where={"id": job.id},
            data={
                "status": "processing",
                "startedAt": datetime.now(),
                "attempts": job.attempts + 1
            }
        )
        
        try:
            # ジョブタイプに応じた処理を実行
            if job.type in self.executors:
                # payloadがdict型の場合はそのまま、文字列の場合はJSONパース
                payload = job.payload if isinstance(job.payload, dict) else json.loads(job.payload)
                result = await self.executors[job.type](payload)
                
                # 成功した場合
                await prisma.jobqueue.update(
                    where={"id": job.id},
                    data={
                        "status": "completed",
                        "completedAt": datetime.now(),
                        "result": json.dumps(result) if result else None
                    }
                )
                logger.info(f"Job {job.id} completed successfully")
            else:
                raise ValueError(f"Unknown job type: {job.type}")
                
        except Exception as e:
            logger.error(f"Job {job.id} failed: {str(e)}")
            
            # 失敗した場合
            is_final_attempt = job.attempts >= job.maxAttempts
            await prisma.jobqueue.update(
                where={"id": job.id},
                data={
                    "status": "failed" if is_final_attempt else "pending",
                    "error": str(e),
                    "completedAt": datetime.now() if is_final_attempt else None
                }
            )
    
    async def _execute_test(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """テスト実行ジョブを処理"""
        # Prismaインスタンスを作成
        prisma = Prisma()
        await prisma.connect()
        
        try:
            executor = TestExecutor(prisma)
            
            # payloadがJSON文字列の場合はパース
            if isinstance(payload, str):
                payload = json.loads(payload)
            
            logger.info(f"Payload type: {type(payload)}, content: {payload}")
            
            # payloadから必要な情報を取得
            session_id = payload.get("session_id") or payload.get("sessionId") or payload.get("testSessionId")
            test_config_id = payload.get("testConfigId") or payload.get("test_config_id")
            mode = payload.get("mode", "omakase")
            scenario_id = payload.get("scenario_id")
            
            if not session_id:
                raise ValueError(f"No session_id found in payload: {payload}")
            
            # URLが指定されていない場合、TestConfigから取得
            url = payload.get("url")
            if not url and test_config_id:
                test_config = await prisma.testconfig.find_unique(
                    where={"id": test_config_id}
                )
                if test_config:
                    url = test_config.url
                    mode = test_config.mode or mode
            
            if not url:
                raise ValueError(f"No URL found in payload or test config")
            
            # TestSessionを更新 (running状態に)
            await prisma.testsession.update(
                where={"id": session_id},
                data={
                    "status": "running",
                    "startedAt": datetime.now()
                }
            )
            
            # テストを実行（同期的に実行）
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor_pool:
                future = executor_pool.submit(
                    executor.execute,
                    session_id=session_id,
                    mode=mode,
                    url=url,
                    scenario_id=scenario_id
                )
                result = future.result()
            
            # TestSessionを更新 (完了状態に)
            await prisma.testsession.update(
                where={"id": session_id},
                data={
                    "status": "completed",
                    "completedAt": datetime.now(),
                    "result": json.dumps(result),
                    "bugsFound": result.get("bugs_found", 0),
                    "testCoverage": result.get("test_coverage", 0.0)
                }
            )
            
            return result
            
        finally:
            await prisma.disconnect()
    
    async def _analyze_bug(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """バグ分析ジョブを処理"""
        analyzer = BugAnalyzer()
        return analyzer.analyze_bug(
            bug_id=payload.get("bug_id"),
            screenshot_path=payload.get("screenshot_path"),
            page_content=payload.get("page_content"),
            error_message=payload.get("error_message")
        )
    
    async def _generate_report(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """レポート生成ジョブを処理"""
        generator = ReportGenerator()
        return generator.generate_report(
            session_id=payload.get("session_id"),
            format=payload.get("format", "html")
        )
    
    async def _generate_scenario(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """シナリオ生成ジョブを処理"""
        generator = ScenarioGenerator()
        return generator.generate_scenario(
            description=payload.get("description"),
            url=payload.get("url"),
            project_id=payload.get("project_id")
        )


@shared_task(name="app.job_queue_poller.poll_job_queue")
def poll_job_queue():
    """
    JobQueueをポーリングして保留中のジョブを処理する
    Celery beatタスクとして10秒ごとに実行される
    """
    processor = JobQueueProcessor()
    
    # Celeryワーカー内でasyncioを安全に使用
    try:
        # 新しいイベントループを作成する前に、既存のループをクリーンアップ
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.close()
        except RuntimeError:
            pass
        
        # 新しいイベントループを作成
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # ロギングの問題を回避するため、デバッグモードを無効化
        loop.set_debug(False)
        
        processed_count = loop.run_until_complete(processor.process_pending_jobs())
        logger.info(f"Processed {processed_count} jobs from JobQueue")
        return processed_count
    except Exception as e:
        logger.error(f"Error polling job queue: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return 0
    finally:
        try:
            loop.close()
        except:
            pass