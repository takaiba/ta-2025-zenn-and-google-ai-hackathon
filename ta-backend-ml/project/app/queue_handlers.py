import uuid
import json
import redis
from celery import Celery
from django.conf import settings
from prisma import Prisma
from datetime import datetime
import logging
import os
from .db_connection import get_database_url

logger = logging.getLogger(__name__)

# Initialize Celery
app = Celery('qa3_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Initialize Redis client for job status tracking
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)


def create_job_id():
    """Generate a unique job ID"""
    return str(uuid.uuid4())


def set_job_status(job_id, status, data=None):
    """Update job status in Redis"""
    job_data = {
        "status": status,
        "updated_at": datetime.utcnow().isoformat()
    }
    if data:
        job_data.update(data)
    
    redis_client.setex(
        f"job:{job_id}",
        86400,  # 24 hour TTL
        json.dumps(job_data)
    )


def get_job_status(job_id):
    """Get job status from Redis"""
    data = redis_client.get(f"job:{job_id}")
    if data:
        return json.loads(data)
    return {"status": "not_found", "error": "Job not found"}


# Queue handlers
def enqueue_test_execution(data):
    """Enqueue a test execution job"""
    # Check if session_id is provided (for existing sessions from frontend)
    job_id = data.get('session_id', create_job_id())
    
    # Set initial status in Redis
    set_job_status(job_id, "queued", {"type": "test_execution"})
    
    # Also create job in JobQueue table for persistent storage
    import asyncio
    from prisma import Prisma
    
    async def create_job_queue_entry():
        prisma = Prisma()
        await prisma.connect()
        try:
            # Check if TestSession exists, create if not
            test_session = await prisma.testsession.find_unique(
                where={"id": job_id}
            )
            
            if not test_session:
                # Create TestSession if it doesn't exist
                await prisma.testsession.create(
                    data={
                        "id": job_id,
                        "projectId": data.get("project_id"),
                        "testConfigId": data.get("test_config_id"),
                        "accountId": data.get("account_id"),
                        "status": "pending",
                        "mode": data.get("mode", "omakase"),
                        "url": data.get("url", "")
                    }
                )
            
            # Create JobQueue entry
            await prisma.jobqueue.create(
                data={
                    "type": "test_execution",
                    "status": "pending",
                    "priority": data.get("priority", 5),
                    "payload": json.dumps({
                        "session_id": job_id,
                        "url": data.get("url"),
                        "mode": data.get("mode", "omakase"),
                        "scenario_id": data.get("scenario_id"),
                        **data
                    }),
                    "testSessionId": job_id
                }
            )
        finally:
            await prisma.disconnect()
    
    # Run async function
    asyncio.run(create_job_queue_entry())
    
    # Enqueue the task
    execute_test_task.delay(job_id, data)
    
    return job_id


def enqueue_bug_analysis(data):
    """Enqueue a bug analysis job"""
    job_id = create_job_id()
    
    # Set initial status
    set_job_status(job_id, "queued", {"type": "bug_analysis"})
    
    # Enqueue the task
    analyze_bug_task.delay(job_id, data)
    
    return job_id


def enqueue_report_generation(data):
    """Enqueue a report generation job"""
    job_id = create_job_id()
    
    # Set initial status
    set_job_status(job_id, "queued", {"type": "report_generation"})
    
    # Enqueue the task
    generate_report_task.delay(job_id, data)
    
    return job_id


def enqueue_scenario_generation(data):
    """Enqueue a scenario generation job"""
    job_id = create_job_id()
    
    # Set initial status
    set_job_status(job_id, "queued", {"type": "scenario_generation"})
    
    # Enqueue the task
    generate_scenario_task.delay(job_id, data)
    
    return job_id


# Celery tasks
@app.task
def execute_test_task(job_id, data):
    """Execute test session task"""
    from .workers.test_executor import TestExecutor
    
    try:
        set_job_status(job_id, "running")
        
        # Initialize Prisma
        prisma = Prisma()
        prisma.connect()
        
        # Create test session in database
        test_session = prisma.testsession.create(
            data={
                "id": job_id,
                "projectId": data["project_id"],
                "testConfigId": data["test_config_id"],
                "accountId": data["account_id"],
                "status": "running",
                "startedAt": datetime.utcnow()
            }
        )
        
        # Execute test
        executor = TestExecutor(prisma)
        result = executor.execute(
            session_id=job_id,
            mode=data["mode"],
            url=data["url"],
            scenario_id=data.get("scenario_id")
        )
        
        # Update test session with results
        prisma.testsession.update(
            where={"id": job_id},
            data={
                "status": "completed",
                "completedAt": datetime.utcnow(),
                "duration": result["duration"],
                "pagesScanned": result["pages_scanned"],
                "bugsFound": result["bugs_found"],
                "testCoverage": result["test_coverage"]
            }
        )
        
        set_job_status(job_id, "completed", result)
        
        prisma.disconnect()
        
    except Exception as e:
        logger.error(f"Test execution failed for job {job_id}: {str(e)}")
        
        if 'prisma' in locals():
            prisma.testsession.update(
                where={"id": job_id},
                data={
                    "status": "failed",
                    "completedAt": datetime.utcnow(),
                    "errorMessage": str(e)
                }
            )
            prisma.disconnect()
        
        set_job_status(job_id, "failed", {"error": str(e)})


@app.task
def analyze_bug_task(job_id, data):
    """Analyze bug task"""
    from .workers.bug_analyzer import BugAnalyzer
    
    try:
        set_job_status(job_id, "running")
        
        # Initialize Prisma
        prisma = Prisma()
        prisma.connect()
        
        # Analyze bug
        analyzer = BugAnalyzer(prisma)
        result = analyzer.analyze(
            test_session_id=data["test_session_id"],
            screenshot=data["screenshot"],
            page_url=data["page_url"],
            error_message=data["error_message"],
            stack_trace=data.get("stack_trace")
        )
        
        # Create bug ticket
        bug_ticket = prisma.bugticket.create(
            data={
                "testSessionId": data["test_session_id"],
                "projectId": result["project_id"],
                "title": result["title"],
                "description": result["description"],
                "severity": result["severity"],
                "status": "open",
                "pageUrl": data["page_url"],
                "screenshot": data["screenshot"],
                "stackTrace": data.get("stack_trace"),
                "reproductionSteps": json.dumps(result["reproduction_steps"]),
                "expectedBehavior": result["expected_behavior"],
                "actualBehavior": result["actual_behavior"],
                "environment": json.dumps(result["environment"])
            }
        )
        
        result["bug_ticket_id"] = bug_ticket.id
        set_job_status(job_id, "completed", result)
        
        prisma.disconnect()
        
    except Exception as e:
        logger.error(f"Bug analysis failed for job {job_id}: {str(e)}")
        set_job_status(job_id, "failed", {"error": str(e)})
        
        if 'prisma' in locals():
            prisma.disconnect()


@app.task
def generate_report_task(job_id, data):
    """Generate report task"""
    from .workers.report_generator import ReportGenerator
    
    try:
        set_job_status(job_id, "running")
        
        # Initialize Prisma
        prisma = Prisma()
        prisma.connect()
        
        # Generate report
        generator = ReportGenerator(prisma)
        result = generator.generate(
            test_session_id=data["test_session_id"],
            format_type=data.get("format", "pdf")
        )
        
        # Save report record
        report = prisma.testreport.create(
            data={
                "testSessionId": data["test_session_id"],
                "accountId": result["account_id"],
                "format": data.get("format", "pdf"),
                "content": result["content"],
                "url": result.get("url")
            }
        )
        
        result["report_id"] = report.id
        set_job_status(job_id, "completed", result)
        
        prisma.disconnect()
        
    except Exception as e:
        logger.error(f"Report generation failed for job {job_id}: {str(e)}")
        set_job_status(job_id, "failed", {"error": str(e)})
        
        if 'prisma' in locals():
            prisma.disconnect()


@app.task
def generate_scenario_task(job_id, data):
    """Generate scenario task"""
    from .workers.scenario_generator import ScenarioGenerator
    
    try:
        set_job_status(job_id, "running")
        
        # Initialize Prisma
        prisma = Prisma()
        prisma.connect()
        
        # Generate scenario
        generator = ScenarioGenerator(prisma)
        result = generator.generate(
            project_id=data["project_id"],
            description=data["description"],
            url=data["url"]
        )
        
        # Save scenario
        scenario = prisma.testscenario.create(
            data={
                "projectId": data["project_id"],
                "name": result["name"],
                "description": data["description"],
                "steps": json.dumps(result["steps"]),
                "expectedResults": json.dumps(result["expected_results"]),
                "aiGenerated": True
            }
        )
        
        result["scenario_id"] = scenario.id
        set_job_status(job_id, "completed", result)
        
        prisma.disconnect()
        
    except Exception as e:
        logger.error(f"Scenario generation failed for job {job_id}: {str(e)}")
        set_job_status(job_id, "failed", {"error": str(e)})
        
        if 'prisma' in locals():
            prisma.disconnect()