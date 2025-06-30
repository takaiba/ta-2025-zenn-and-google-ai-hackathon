#!/bin/bash

# Start Celery worker for QA³ backend

echo "Starting Celery worker..."

# Navigate to project directory
cd /Users/kosuke.takanezawa/Documents/GitHub/ta/ta-backend-ml/project

# Start Celery worker with 4 concurrent processes
celery -A project worker --loglevel=info --concurrency=4

# Alternative command with more options:
# celery -A project worker --loglevel=info --concurrency=4 --max-tasks-per-child=100 --time-limit=3600