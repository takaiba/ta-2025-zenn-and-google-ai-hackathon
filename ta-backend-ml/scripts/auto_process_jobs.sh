#!/bin/bash
# JobQueueを定期的に処理するスクリプト

echo "Starting JobQueue auto processor..."

while true; do
    # JobQueueを処理
    docker exec ta-backend-ml-web bash -c "cd /app/project && python simple_job_processor.py" 2>/dev/null
    
    # 10秒待機
    sleep 10
done