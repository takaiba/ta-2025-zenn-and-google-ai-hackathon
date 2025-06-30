#!/bin/bash
set -e

# Wait for database to be ready
wait_for_db() {
    echo "Waiting for database..."
    
    # psycopg2のインストールを確認
    python -c "import psycopg2" 2>/dev/null || {
        echo "psycopg2 not found. Using Prisma for database check instead."
        return 0  # psycopg2がない場合はスキップ
    }
    
    while ! python -c "
import os
import sys
try:
    import psycopg2
    # Docker内からホストのPostgreSQLに接続する場合
    db_url = os.environ.get('DATABASE_ROOT_URL', '')
    if 'host.docker.internal' in db_url:
        # macOS/Windows Dockerの場合
        print('Using host.docker.internal for database connection')
    elif '127.0.0.1' in db_url or 'localhost' in db_url:
        # Linux Dockerの場合、host.docker.internalに置き換え
        db_url = db_url.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal')
        print(f'Replaced localhost/127.0.0.1 with host.docker.internal')
    
    conn = psycopg2.connect(db_url)
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f'Database connection failed: {e}')
    sys.exit(1)
" 2>&1; do
        echo "Database is unavailable - sleeping"
        sleep 2
    done
    echo "Database is up!"
}

# Wait for Redis to be ready
wait_for_redis() {
    echo "Waiting for Redis..."
    while ! python -c "
import os
import redis
import sys
try:
    r = redis.Redis(host=os.environ.get('REDIS_HOST', 'localhost'), 
                    port=int(os.environ.get('REDIS_PORT', 6379)))
    r.ping()
    sys.exit(0)
except Exception as e:
    sys.exit(1)
" 2>/dev/null; do
        echo "Redis is unavailable - sleeping"
        sleep 2
    done
    echo "Redis is up!"
}

# Change to app directory first for Prisma
cd /app

# Run different commands based on the first argument
case "$1" in
    web)
        echo "Starting Django web server..."
        wait_for_db
        wait_for_redis
        
        # Generate Prisma client
        echo "Generating Prisma client..."
        prisma generate
        
        # Push Prisma schema to database
        echo "Pushing Prisma schema..."
        prisma db push --skip-generate
        
        # Change to project directory for Django
        cd /app/project
        
        # Run migrations
        echo "Running database migrations..."
        python manage.py migrate --noinput
        
        # Collect static files
        echo "Collecting static files..."
        python manage.py collectstatic --noinput || true
        
        # Start Django server
        echo "Starting Django development server on 0.0.0.0:8000..."
        exec python manage.py runserver 0.0.0.0:8000
        ;;
        
    worker)
        echo "Starting Celery worker..."
        wait_for_db
        wait_for_redis
        
        # Generate Prisma client
        echo "Generating Prisma client..."
        prisma generate
        
        # Install Playwright browsers if not already installed
        if [ ! -d "/root/.cache/ms-playwright/chromium-1091" ]; then
            echo "Installing Playwright browsers..."
            playwright install chromium
        fi
        
        # Change to project directory for Django
        cd /app/project
        
        # Start Celery worker
        echo "Starting Celery worker with 4 concurrent processes..."
        exec celery -A project worker --loglevel=info --concurrency=4
        ;;
        
    beat)
        echo "Starting Celery beat..."
        wait_for_db
        wait_for_redis
        
        # Change to project directory for Django
        cd /app/project
        
        # Start Celery beat
        echo "Starting Celery beat scheduler..."
        exec celery -A project beat --loglevel=info
        ;;
        
    flower)
        echo "Starting Flower..."
        wait_for_redis
        
        # Change to project directory for Django
        cd /app/project
        
        # Start Flower
        echo "Starting Flower on port 5555..."
        exec celery -A project flower --port=5555
        ;;
        
    prod)
        echo "Starting production server with Gunicorn..."
        wait_for_db
        wait_for_redis
        
        # Generate Prisma client
        echo "Generating Prisma client..."
        prisma generate
        
        # Push Prisma schema to database
        echo "Pushing Prisma schema..."
        prisma db push --skip-generate
        
        # Change to project directory for Django
        cd /app/project
        
        # Run migrations
        echo "Running database migrations..."
        python manage.py migrate --noinput
        
        # Collect static files
        echo "Collecting static files..."
        python manage.py collectstatic --noinput || true
        
        # Start Gunicorn
        echo "Starting Gunicorn on 0.0.0.0:8000..."
        exec gunicorn project.wsgi:application \
            --bind 0.0.0.0:8000 \
            --workers 4 \
            --threads 2 \
            --timeout 120 \
            --access-logfile - \
            --error-logfile -
        ;;
        
    shell)
        echo "Starting Django shell..."
        wait_for_db
        wait_for_redis
        exec python manage.py shell
        ;;
        
    test)
        echo "Running tests..."
        wait_for_db
        wait_for_redis
        exec python manage.py test
        ;;
        
    websocket)
        echo "Starting WebSocket server for realtime monitoring..."
        wait_for_db
        wait_for_redis
        
        # Generate Prisma client
        echo "Generating Prisma client..."
        prisma generate
        
        # Change to project directory for Django
        cd /app/project
        
        # Start WebSocket server
        echo "Starting WebSocket server on 0.0.0.0:8765..."
        exec python manage.py start_websocket_server --host 0.0.0.0 --port 8765
        ;;
        
    *)
        echo "Usage: $0 {web|worker|beat|flower|prod|shell|test|websocket}"
        echo "  web       - Start Django development server"
        echo "  worker    - Start Celery worker"
        echo "  beat      - Start Celery beat scheduler"
        echo "  flower    - Start Flower monitoring"
        echo "  prod      - Start production server with Gunicorn"
        echo "  shell     - Start Django shell"
        echo "  test      - Run tests"
        echo "  websocket - Start WebSocket server for realtime monitoring"
        exit 1
        ;;
esac