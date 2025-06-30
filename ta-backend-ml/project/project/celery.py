import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

app = Celery('qa3_backend')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule - 定期実行タスクの設定
app.conf.beat_schedule = {
    'poll-job-queue': {
        'task': 'app.job_queue_sync.process_job_queue',
        'schedule': 10.0,  # 10秒ごとに実行
        'options': {
            'expires': 5,  # タスクの有効期限（秒）
        }
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')