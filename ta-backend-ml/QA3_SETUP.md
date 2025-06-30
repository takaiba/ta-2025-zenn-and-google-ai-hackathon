# QA³ Backend ML Setup Guide

## Overview
This is the machine learning backend for the QA³ (QA Cube) automated testing platform. It provides queue-based processing for test execution, bug analysis, report generation, and scenario generation.

## Architecture

### Main Components:
1. **Django REST API** - Handles HTTP requests and enqueues jobs
2. **Celery Workers** - Process queued jobs asynchronously
3. **Redis** - Message broker and job status storage
4. **Prisma** - Database ORM for PostgreSQL
5. **Playwright** - Browser automation for test execution
6. **OpenAI API** - AI-powered analysis and generation

### API Endpoints:
- `GET /api/healthcheck` - Health check endpoint
- `POST /api/v1/test/execute` - Execute test session
- `GET /api/v1/test/status/<session_id>` - Get test status
- `POST /api/v1/bug/analyze` - Analyze bug
- `POST /api/v1/report/generate` - Generate report
- `POST /api/v1/scenario/generate` - Generate test scenario

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install Playwright Browsers
```bash
playwright install chromium
```

### 3. Set Environment Variables
Create a `.env` file with:
```env
# Database
DATABASE_ROOT_URL=postgresql://user:password@localhost:5432/qa3_db

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Sentry (optional)
SENTRY_DSN=your_sentry_dsn
```

### 4. Initialize Prisma
```bash
cd project
prisma generate
prisma db push
```

### 5. Run Migrations
```bash
python manage.py migrate
```

### 6. Start Redis
```bash
redis-server
```

### 7. Start Celery Worker
```bash
cd project
./start_workers.sh
```

### 8. Start Django Server
```bash
python manage.py runserver
```

## Queue Processing System

### Test Execution Worker (`test_executor.py`)
- Executes automated tests using Playwright
- Supports three modes: omakase (autonomous), scenario, and hybrid
- Performs AI-powered page analysis
- Detects accessibility issues
- Creates test results in database

### Bug Analyzer Worker (`bug_analyzer.py`)
- Analyzes bugs using AI
- Determines bug severity
- Generates reproduction steps
- Creates detailed bug tickets

### Report Generator Worker (`report_generator.py`)
- Generates test reports in PDF, HTML, or JSON format
- Includes test summary, results, and bug analysis
- Creates visualizations for bug severity distribution

### Scenario Generator Worker (`scenario_generator.py`)
- Generates test scenarios from natural language descriptions
- Analyzes page structure
- Creates executable test steps
- Validates and refines generated scenarios

## Development

### Running Tests
```bash
python manage.py test
```

### Monitoring Celery
```bash
celery -A project flower
```

### Checking Queue Status
Use Redis CLI:
```bash
redis-cli
> KEYS job:*
```

## Important Notes

1. **Restart Required**: After installing new dependencies, restart both the Django server and Celery workers.

2. **Playwright Setup**: Ensure Playwright browsers are installed before running tests.

3. **API Keys**: OpenAI API key is required for AI-powered features.

4. **Database**: PostgreSQL database must be running and accessible.

5. **Redis**: Redis server must be running for queue processing.

## Troubleshooting

### Common Issues:

1. **Import Errors**: Ensure all dependencies are installed and virtual environment is activated.

2. **Database Connection**: Check DATABASE_ROOT_URL in .env file.

3. **Redis Connection**: Ensure Redis server is running on configured host/port.

4. **Playwright Issues**: Run `playwright install` to install browsers.

5. **Celery Not Processing**: Check Celery worker logs and ensure Redis is accessible.