"""Exercise the production Gunicorn CLI and HTTP framing on Linux, without services."""

import http.client
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest

from django.conf import settings
from django.core.wsgi import get_wsgi_application
from django.http import HttpResponse
from django.urls import path

if not settings.configured:
    settings.configure(
        DEBUG=False, SECRET_KEY="isolated-ci-only", ALLOWED_HOSTS=["localhost"],
        ROOT_URLCONF=__name__, MIDDLEWARE=[], INSTALLED_APPS=[],
    )


def health(request):
    return HttpResponse(request.body or b"ok", content_type="text/plain")


urlpatterns = [path("health", health)]
application = get_wsgi_application()


class GunicornSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.log = tempfile.TemporaryFile(mode="w+")
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            cls.port = sock.getsockname()[1]
        cls.server = subprocess.Popen(
            [sys.executable, "-m", "gunicorn", "test_gunicorn_security:application",
             "--bind", f"127.0.0.1:{cls.port}", "--workers", "4", "--threads", "2",
             "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"],
            cwd=Path(__file__).resolve().parent, stdout=cls.log, stderr=cls.log,
        )
        cls.addClassCleanup(cls.cleanup_server)
        for _ in range(100):
            if cls.server.poll() is not None:
                raise RuntimeError("Gunicorn exited before becoming ready")
            try:
                with socket.create_connection(("127.0.0.1", cls.port), timeout=0.2):
                    return
            except OSError:
                time.sleep(0.1)
        raise RuntimeError("Gunicorn startup timed out")

    @classmethod
    def cleanup_server(cls):
        cls.server.terminate()
        try:
            cls.server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            cls.server.kill()
            cls.server.wait(timeout=5)
        cls.log.seek(0)
        print(cls.log.read())
        cls.log.close()

    def request(self, headers, body=b""):
        raw = (b"POST /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n"
               + headers + b"\r\n" + body)
        with socket.create_connection(("127.0.0.1", self.port), timeout=5) as sock:
            sock.sendall(raw)
            response = http.client.HTTPResponse(sock)
            response.begin()
            return response.status, response.read()

    def test_valid_content_length(self):
        self.assertEqual(self.request(b"Content-Length: 5\r\n", b"hello"), (200, b"hello"))

    def test_valid_chunked(self):
        self.assertEqual(
            self.request(b"Transfer-Encoding: chunked\r\n", b"5\r\nhello\r\n0\r\n\r\n"),
            (200, b"hello"),
        )

    def test_cve_2024_1135_conflicting_transfer_encoding(self):
        status, _ = self.request(
            b"Transfer-Encoding: chunked\r\nTransfer-Encoding: gzip\r\n",
            b"0\r\n\r\n",
        )
        self.assertIn(status, (400, 501))

    def test_cve_2024_6827_unsupported_transfer_encoding(self):
        status, _ = self.request(
            b"Transfer-Encoding: gzip\r\nContent-Length: 1\r\n", b"a",
        )
        self.assertIn(status, (400, 501))


if __name__ == "__main__":
    unittest.main(verbosity=2)
