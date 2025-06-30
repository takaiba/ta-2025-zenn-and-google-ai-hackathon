#!/usr/bin/env python
"""
EnhancedTestExecutorの動作確認スクリプト
"""
import os
import sys
import asyncio

# Django設定
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

import django
django.setup()

from app.workers.test_executor_enhanced import EnhancedTestExecutor
from prisma import Prisma

async def main():
    """テスト実行"""
    print("Starting enhanced test executor test...")
    
    prisma = Prisma()
    await prisma.connect()
    
    try:
        executor = EnhancedTestExecutor(prisma)
        
        # 実在するテストセッションIDを使用
        session_id = "5e850945-66d7-47bd-83cc-92ec9defbfe8"
        
        # テスト実行
        result = executor.execute(
            session_id=session_id,
            mode="omakase",
            url="https://www.example.com"
        )
        
        print(f"\nTest completed!")
        print(f"Pages scanned: {result['pages_scanned']}")
        print(f"Bugs found: {result['bugs_found']}")
        print(f"Coverage: {result['test_coverage'] * 100:.1f}%")
        print(f"Duration: {result['duration']}s")
        
        if result['bugs']:
            print(f"\nBugs found:")
            for bug in result['bugs'][:5]:
                print(f"  - {bug['type']}: {bug['error_message']}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main())