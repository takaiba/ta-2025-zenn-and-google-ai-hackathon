"""
JobQueueの保留中ジョブを処理するスクリプト
"""
import asyncio
import os
import sys
import django

# Django設定を読み込む
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from app.job_queue_poller import JobQueueProcessor


async def main():
    """既存のJobQueueエントリを処理"""
    processor = JobQueueProcessor()
    
    print("Processing pending jobs from JobQueue...")
    processed_count = await processor.process_pending_jobs()
    print(f"Processed {processed_count} jobs")


if __name__ == "__main__":
    asyncio.run(main())