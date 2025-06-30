from django.urls import path
from . import views

urlpatterns = [
    path("", views.healthcheck),
    path("api/healthcheck", views.healthcheck),
    path("api/v1/test/execute", views.execute_test),
    path("api/v1/test/status/<str:session_id>", views.get_test_status),
    path("api/v1/bug/analyze", views.analyze_bug),
    path("api/v1/report/generate", views.generate_report),
    path("api/v1/scenario/generate", views.generate_scenario),
    
    # Realtime test endpoints
    path("api/v1/realtime/test/continuous/start", views.start_continuous_test),
    path("api/v1/realtime/test/enhanced/start", views.start_enhanced_test),
    path("api/v1/realtime/test/status/<str:session_id>", views.get_realtime_session_status),
    path("api/v1/realtime/test/stop", views.stop_realtime_session),
    path("api/v1/realtime/session/<str:session_id>/logs", views.get_session_logs),
    path("api/v1/realtime/session/<str:session_id>/bugs", views.get_session_bugs),
    
    # Realtime monitoring page
    path("realtime/monitor", views.realtime_monitor),
]