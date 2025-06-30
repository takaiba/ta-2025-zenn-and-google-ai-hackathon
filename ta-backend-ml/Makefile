.PHONY: up format migrate batch runserver down

IMAGE_NAME=ta-backend-ml

# Check environment variables
check-env:
	@python3 scripts/check_env.py

# Main serve command - use docker compose without local pip install
serve:
	@echo "Starting services..."
	@python3 scripts/check_env.py 2>/dev/null || echo "⚠️  環境変数チェックをスキップしました"
	docker compose up

# Serve with rebuilding images
reserve:
	@echo "Starting services with rebuild..."
	@python3 scripts/check_env.py 2>/dev/null || echo "⚠️  環境変数チェックをスキップしました"
	docker compose up --build

# Serve in detached mode
serve-detached:
	docker compose up -d

# Serve in daemon mode (alias for serve-detached)
serve-daemon:
	@echo "Starting services in daemon mode..."
	@python3 scripts/check_env.py 2>/dev/null || echo "⚠️  環境変数チェックをスキップしました"
	docker compose up -d
	@echo "✅ Services started in background"
	@echo "Check logs: make logs"
	@echo "Check status: docker compose ps"

# Serve with auto job processing
serve-auto:
	@echo "Starting services with auto job processing..."
	@python3 scripts/check_env.py 2>/dev/null || echo "⚠️  環境変数チェックをスキップしました"
	docker compose up -d
	@echo "✅ Services started"
	@echo "Starting auto job processor..."
	@./scripts/auto_process_jobs.sh

# Serve with full rebuild in detached mode
serve-rebuild:
	docker compose up --build -d

# Stop all services
down:
	docker compose down

# Stop and remove volumes
down-volumes:
	docker compose down -v

# View logs
logs:
	docker compose logs -f

# View specific service logs
logs-web:
	docker compose logs -f web

logs-worker:
	docker compose logs -f celery_worker

logs-redis:
	docker compose logs -f redis

# Execute commands in containers
shell:
	docker exec -it ta-backend-ml-web bash

shell-worker:
	docker exec -it ta-backend-ml-celery-worker bash

# Django management commands
manage:
	docker exec -it ta-backend-ml-web python manage.py $(cmd)

migrate:
	docker exec -it ta-backend-ml-web python manage.py migrate

makemigrations:
	docker exec -it ta-backend-ml-web python manage.py makemigrations

createsuperuser:
	docker exec -it ta-backend-ml-web python manage.py createsuperuser

collectstatic:
	docker exec -it ta-backend-ml-web python manage.py collectstatic --noinput

# Prisma commands
prisma-generate:
	docker exec -it ta-backend-ml-web prisma generate

prisma-push:
	docker exec -it ta-backend-ml-web prisma db push

# Local development setup (if running outside Docker)
install:
	pip install -r requirements.txt
	playwright install chromium

install-dev:
	pip install -r requirements.txt
	pip install -r requirements-dev.txt
	playwright install chromium

# Generate Prisma schema from frontend
generate:
	# Copy schema from frontend
	cp -Rf ../ta-frontend/prisma/schema.prisma ./schema.prisma
	
	# Clean up schema if cleanup script exists
	python prisma_schema_cleanup.py || true
	
	# Generate Prisma client
	prisma generate || true

# Linting and formatting
lint:
	ruff check --fix project/app/

format:
	ruff format project/app/

# Test commands
test:
	docker exec -it ta-backend-ml-web python manage.py test

test-local:
	cd project && python manage.py test

# API testing commands
test-api:
	@echo "Running API tests..."
	@bash scripts/test_api.sh

test-api-full:
	@echo "Running full API tests with performance..."
	@bash scripts/test_api.sh --with-performance

test-interactive:
	@echo "Starting interactive test tool..."
	@python3 scripts/interactive_test.py

test-all:
	@echo "Running all automated tests..."
	@python3 scripts/interactive_test.py --all

test-health:
	@echo "Running health checks..."
	@python3 scripts/interactive_test.py --health

# Start individual services
start-web:
	cd project && python manage.py runserver 0.0.0.0:8000

start-worker:
	cd project && celery -A project worker --loglevel=info

start-beat:
	cd project && celery -A project beat --loglevel=info

start-flower:
	cd project && celery -A project flower

# Health check
health:
	curl -f http://localhost:8000/api/healthcheck || exit 1

# Quick start for development
quick-start:
	@echo "Starting QA³ Backend ML Services..."
	@echo "1. Starting Redis..."
	docker compose up -d redis
	@echo "2. Waiting for Redis to be ready..."
	sleep 5
	@echo "3. Starting web service..."
	docker compose up -d web
	@echo "4. Running migrations..."
	sleep 5
	docker exec -it ta-backend-ml-web python manage.py migrate || true
	@echo "5. Starting Celery workers..."
	docker compose up -d celery_worker celery_beat
	@echo "6. Starting Flower monitoring..."
	docker compose up -d flower
	@echo ""
	@echo "✅ All services started!"
	@echo "- Web API: http://localhost:8000"
	@echo "- Flower: http://localhost:5555"
	@echo ""
	@echo "Run 'make logs' to view logs"
	@echo "Run 'make down' to stop all services"

# Help command
help:
	@echo "QA³ Backend ML - Makefile Commands"
	@echo ""
	@echo "Main Commands:"
	@echo "  make serve          - Start all services using Docker Compose"
	@echo "  make serve-build    - Start all services with rebuild"
	@echo "  make serve-detached - Start all services in background"
	@echo "  make down           - Stop all services"
	@echo "  make logs           - View logs from all services"
	@echo "  make quick-start    - Quick start with step-by-step initialization"
	@echo ""
	@echo "Container Commands:"
	@echo "  make shell          - Open bash shell in web container"
	@echo "  make shell-worker   - Open bash shell in worker container"
	@echo "  make manage cmd=... - Run Django management command"
	@echo "  make migrate        - Run database migrations"
	@echo ""
	@echo "Testing Commands:"
	@echo "  make test           - Run Django unit tests"
	@echo "  make test-api       - Run API tests"
	@echo "  make test-api-full  - Run API tests with performance"
	@echo "  make test-interactive - Start interactive test tool"
	@echo "  make test-all       - Run all automated tests"
	@echo "  make test-health    - Run health checks only"
	@echo ""
	@echo "Development Commands:"
	@echo "  make lint           - Run linting"
	@echo "  make format         - Format code"
	@echo ""
	@echo "Service URLs:"
	@echo "  - Web API: http://localhost:8000"
	@echo "  - Flower:  http://localhost:5555"
	@echo "  - WebSocket: ws://localhost:8765"
	@echo "  - Realtime Monitor: http://localhost:8000/realtime/monitor"
