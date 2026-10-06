"""Tests for the generated service (standard library unittest, no dependencies)."""

import json
import threading
import unittest
import urllib.error
import urllib.request

from ${{ values.module }}.app import make_server


class AppTest(unittest.TestCase):
    def start(self, database_url: str | None = None) -> str:
        server = make_server(0, database_url)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        return f"http://127.0.0.1:{server.server_address[1]}"

    def get(self, url: str) -> tuple[int, dict[str, str]]:
        try:
            with urllib.request.urlopen(url) as res:
                return res.status, json.loads(res.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_liveness_probe_answers_ok(self) -> None:
        self.assertEqual(self.get(self.start() + "/healthz"), (200, {"status": "ok"}))

    def test_root_names_the_service(self) -> None:
        self.assertEqual(self.get(self.start() + "/"), (200, {"service": "${{ values.name }}"}))

    def test_unknown_paths_are_refused(self) -> None:
        self.assertEqual(self.get(self.start() + "/nope")[0], 404)
{%- if values.database %}

    def test_readiness_depends_on_the_database_setting(self) -> None:
        self.assertEqual(self.get(self.start() + "/readyz")[0], 503)
        self.assertEqual(self.get(self.start("postgres://db/app") + "/readyz")[0], 200)
{%- endif %}


if __name__ == "__main__":
    unittest.main()
