"""
Celeryタスクの登録
"""
from .queue_handlers import execute_test_task, analyze_bug_task, generate_report_task, generate_scenario_task
from .job_queue_poller import poll_job_queue

__all__ = [
    'execute_test_task',
    'analyze_bug_task', 
    'generate_report_task',
    'generate_scenario_task',
    'poll_job_queue'
]