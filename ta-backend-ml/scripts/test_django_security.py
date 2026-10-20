"""Django security regressions and application HTTP compatibility, without workers.

Use the real settings, middleware, URLs, views, Celery and Sentry integration.
Only queue/AI task boundaries are mocked; no external job or API is invoked.
"""

import os
from pathlib import Path
import sys
from types import ModuleType
import unittest
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "project"))
os.environ["DJANGO_SETTINGS_MODULE"] = "project.settings"
os.environ["SENTRY_DSN"] = ""

queue = ModuleType("app.queue_handlers")
for name in (
    "enqueue_test_execution", "enqueue_bug_analysis", "enqueue_report_generation",
    "enqueue_scenario_generation", "get_job_status",
):
    setattr(queue, name, Mock(return_value="isolated-job"))
sys.modules[queue.__name__] = queue
tasks = ModuleType("app.workers.continuous_test_celery_task")
for name in ("execute_continuous_test_task", "execute_enhanced_test_task"):
    setattr(tasks, name, Mock())
sys.modules[tasks.__name__] = tasks
# app.__init__ eagerly imports worker registrations (Prisma/AI clients).
# Those registrations are outside this HTTP/Django compatibility test.
sys.modules["app.celery_app"] = ModuleType("app.celery_app")

import django
from django.conf import settings

# Match the Dockerfile's log directory setup, and isolate every DB connection.
(Path(__file__).resolve().parents[1] / "project" / "logs").mkdir(exist_ok=True)
settings.DATABASES["default"]["NAME"] = ":memory:"
django.setup()

from django.contrib.auth.models import User
from django.core import signing
from django.core.management import call_command
from django.db.models import FilteredRelation
from django.http import HttpRequest, HttpResponse
from django.test import Client


class DjangoSecurityTests(unittest.TestCase):
    def test_cve_2025_13473_filtered_relation_alias_rejects_period(self):
        # The vulnerable release accepts a period in a FilteredRelation alias,
        # which can subsequently be interpreted as SQL by order_by().
        with self.assertRaises(ValueError):
            User.objects.alias(**{"groups.alias": FilteredRelation("groups")})

    def test_signed_cookie_namespaces_do_not_collide(self):
        # Concatenating key + salt used to give both cookies the same namespace.
        response = HttpResponse()
        response.set_signed_cookie("ab", "isolated-payload", salt="c")
        request = HttpRequest()
        request.COOKIES["a"] = response.cookies["ab"].value
        with self.assertRaises(signing.BadSignature):
            request.get_signed_cookie("a", salt="bc")


class ApplicationCompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.client = Client()

    def test_health_routes(self):
        for route in ("/", "/api/healthcheck"):
            with self.subTest(route=route):
                response = self.client.get(route)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {"status": "ok", "service": "qa3-backend-ml"})

    def test_valid_signed_cookie(self):
        response = HttpResponse()
        response.set_signed_cookie("session", "payload", salt="application")
        request = HttpRequest()
        request.COOKIES["session"] = response.cookies["session"].value
        self.assertEqual(request.get_signed_cookie("session", salt="application"), "payload")

    def test_valid_filtered_relation(self):
        query = User.objects.alias(selected_groups=FilteredRelation("groups"))
        self.assertIn("ORDER BY", str(query.order_by("selected_groups__name").query))

    def test_method_restrictions(self):
        self.assertEqual(self.client.post("/api/healthcheck").status_code, 405)
        self.assertEqual(self.client.get("/api/v1/test/execute").status_code, 405)

    def test_invalid_json(self):
        response = self.client.post("/api/v1/test/execute", "{", content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "Invalid JSON payload"})

    def test_missing_required_field(self):
        response = self.client.post("/api/v1/test/execute", {}, content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "Missing required field: project_id"})

    def test_valid_job_payload(self):
        payload = {"project_id": "project", "test_config_id": "config", "account_id": "account",
                   "mode": "scenario", "url": "https://example.com"}
        response = self.client.post("/api/v1/test/execute", payload, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["session_id"], "isolated-job")
        getattr(queue, "enqueue_test_execution").assert_called_once_with(payload)

    def test_admin_login(self):
        response = self.client.get("/admin/login/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'name="username"', response.content)
        self.assertIn(b'name="password"', response.content)

    def test_system_checks_and_model_migration_state(self):
        call_command("check")
        # An isolated, in-memory SQLite DB only; never touch the submitted db.sqlite3.
        call_command("migrate", verbosity=0, interactive=False)
        call_command("makemigrations", check=True, dry_run=True, verbosity=1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
