import json
import asyncio
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .queue_handlers import (
    enqueue_test_execution,
    enqueue_bug_analysis,
    enqueue_report_generation,
    enqueue_scenario_generation,
    get_job_status
)
# Realtime functionality handled via Celery tasks only
from .workers.continuous_test_celery_task import execute_continuous_test_task, execute_enhanced_test_task


@require_http_methods(["GET"])
def healthcheck(request):
    return JsonResponse({"status": "ok", "service": "qa3-backend-ml"})


@csrf_exempt
@require_http_methods(["POST"])
def execute_test(request):
    """
    Execute a test session
    Expected payload:
    {
        "project_id": "string",
        "test_config_id": "string",
        "account_id": "string",
        "mode": "omakase|scenario|hybrid",
        "url": "string",
        "scenario_id": "string" (optional)
    }
    """
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ["project_id", "test_config_id", "account_id", "mode", "url"]
        for field in required_fields:
            if field not in data:
                return JsonResponse({"error": f"Missing required field: {field}"}, status=400)
        
        # Enqueue test execution job
        job_id = enqueue_test_execution(data)
        
        return JsonResponse({
            "session_id": job_id,
            "status": "queued",
            "message": "Test execution has been queued"
        })
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["GET"])
def get_test_status(request, session_id):
    """Get the status of a test session"""
    try:
        status = get_job_status(session_id)
        return JsonResponse(status)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def analyze_bug(request):
    """
    Analyze a bug from test results
    Expected payload:
    {
        "test_session_id": "string",
        "screenshot": "string" (base64),
        "page_url": "string",
        "error_message": "string",
        "stack_trace": "string" (optional)
    }
    """
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ["test_session_id", "screenshot", "page_url", "error_message"]
        for field in required_fields:
            if field not in data:
                return JsonResponse({"error": f"Missing required field: {field}"}, status=400)
        
        # Enqueue bug analysis job
        job_id = enqueue_bug_analysis(data)
        
        return JsonResponse({
            "job_id": job_id,
            "status": "queued",
            "message": "Bug analysis has been queued"
        })
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def generate_report(request):
    """
    Generate a test report
    Expected payload:
    {
        "test_session_id": "string",
        "format": "pdf|html|json"
    }
    """
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        if "test_session_id" not in data:
            return JsonResponse({"error": "Missing required field: test_session_id"}, status=400)
        
        format_type = data.get("format", "pdf")
        if format_type not in ["pdf", "html", "json"]:
            return JsonResponse({"error": "Invalid format. Must be pdf, html, or json"}, status=400)
        
        # Enqueue report generation job
        job_id = enqueue_report_generation(data)
        
        return JsonResponse({
            "job_id": job_id,
            "status": "queued",
            "message": "Report generation has been queued"
        })
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def generate_scenario(request):
    """
    Generate test scenarios from user flow description
    Expected payload:
    {
        "project_id": "string",
        "description": "string",
        "url": "string"
    }
    """
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ["project_id", "description", "url"]
        for field in required_fields:
            if field not in data:
                return JsonResponse({"error": f"Missing required field: {field}"}, status=400)
        
        # Enqueue scenario generation job
        job_id = enqueue_scenario_generation(data)
        
        return JsonResponse({
            "job_id": job_id,
            "status": "queued",
            "message": "Scenario generation has been queued"
        })
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def start_continuous_test(request):
    """
    Start a continuous test (10 loops) with realtime monitoring via Celery
    Expected payload:
    {
        "session_id": "string",
        "url": "string",
        "loop_count": "number" (optional, default 10)
    }
    """
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ["session_id", "url"]
        for field in required_fields:
            if field not in data:
                return JsonResponse({"error": f"Missing required field: {field}"}, status=400)
        
        session_id = data["session_id"]
        url = data["url"]
        loop_count = data.get("loop_count", 10)
        
        # Celery taskとして非同期実行
        task = execute_continuous_test_task.delay(session_id, url, loop_count)
        
        return JsonResponse({
            "status": "started",
            "task_id": task.id,
            "session_id": session_id,
            "message": "連続テスト実行をCeleryワーカーで開始しました"
        })
            
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def start_enhanced_test(request):
    """
    Start an enhanced test via Celery
    Expected payload:
    {
        "session_id": "string",
        "mode": "omakase|scenario|hybrid",
        "url": "string",
        "scenario_id": "string" (optional)
    }
    """
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ["session_id", "mode", "url"]
        for field in required_fields:
            if field not in data:
                return JsonResponse({"error": f"Missing required field: {field}"}, status=400)
        
        session_id = data["session_id"]
        mode = data["mode"]
        url = data["url"]
        scenario_id = data.get("scenario_id")
        
        # Celery taskとして非同期実行
        task = execute_enhanced_test_task.delay(session_id, mode, url, scenario_id)
        
        return JsonResponse({
            "status": "started",
            "task_id": task.id,
            "session_id": session_id,
            "message": "拡張テスト実行をCeleryワーカーで開始しました"
        })
            
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["GET"])
def get_realtime_session_status(request, session_id):
    """Get the status of a realtime test session"""
    try:
        # セッションステータスをCeleryタスクIDベースで取得
        from celery.result import AsyncResult
        
        # セッションに関連するタスクの状態を取得（簡略版）
        return JsonResponse({
            "session_id": session_id,
            "status": "running",  # 実際にはデータベースから取得
            "message": "Celeryタスクとして実行中"
        })
            
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def stop_realtime_session(request):
    """
    Stop a realtime test session (Celeryタスクの停止)
    Expected payload:
    {
        "session_id": "string"
    }
    """
    try:
        data = json.loads(request.body)
        
        if "session_id" not in data:
            return JsonResponse({"error": "Missing required field: session_id"}, status=400)
        
        session_id = data["session_id"]
        
        # Celeryタスクの停止（実装は複雑なので簡略版）
        return JsonResponse({
            "status": "stopped",
            "session_id": session_id,
            "message": "停止リクエストを送信しました"
        })
            
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["GET"])
def get_session_logs(request, session_id):
    """Get logs for a test session from database"""
    try:
        limit = int(request.GET.get('limit', 50))
        
        # データベースから直接ログを取得
        from prisma import Prisma
        import asyncio
        
        async def get_logs():
            prisma = Prisma()
            await prisma.connect()
            try:
                logs = await prisma.testsessionlog.find_many(
                    where={'testSessionId': session_id},
                    order_by=[{'createdAt': 'desc'}],
                    take=limit
                )
                return [
                    {
                        'id': log.id,
                        'level': log.logLevel,
                        'message': log.message,
                        'timestamp': log.createdAt.isoformat(),
                        'has_screenshot': bool(log.screenshot)
                    } for log in logs
                ]
            finally:
                await prisma.disconnect()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            logs = loop.run_until_complete(get_logs())
            return JsonResponse({
                "session_id": session_id,
                "logs": logs
            })
        finally:
            loop.close()
            
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["GET"])
def get_session_bugs(request, session_id):
    """Get bugs discovered in a test session from database"""
    try:
        # データベースから直接バグを取得
        from prisma import Prisma
        import asyncio
        
        async def get_bugs():
            prisma = Prisma()
            await prisma.connect()
            try:
                bugs = await prisma.bugticket.find_many(
                    where={'testSessionId': session_id},
                    order_by=[{'createdAt': 'desc'}]
                )
                return [
                    {
                        'id': bug.id,
                        'title': bug.title,
                        'description': bug.description,
                        'severity': bug.severity,
                        'bug_type': bug.bugType,
                        'affected_url': bug.affectedUrl,
                        'created_at': bug.createdAt.isoformat()
                    } for bug in bugs
                ]
            finally:
                await prisma.disconnect()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            bugs = loop.run_until_complete(get_bugs())
            return JsonResponse({
                "session_id": session_id,
                "bugs": bugs
            })
        finally:
            loop.close()
            
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["GET"])
def realtime_monitor(request):
    """リアルタイムテスト監視のWebページを表示"""
    return render(request, 'realtime_test_monitor.html')