"""HTTP service built on the standard library only."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SERVICE = "${{ values.name }}"


def make_server(port: int, database_url: str | None = None) -> ThreadingHTTPServer:
    """Server bound to localhost:port (port 0 picks a free port)."""

    class Handler(BaseHTTPRequestHandler):
        def _reply(self, status: int, body: dict[str, str]) -> None:
            data = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self) -> None:
            if self.path == "/healthz":
                self._reply(200, {"status": "ok"})
{%- if values.database %}
            elif self.path == "/readyz":
                if database_url:
                    self._reply(200, {"database": "configured"})
                else:
                    self._reply(503, {"database": "DATABASE_URL is not set"})
{%- endif %}
            elif self.path == "/":
                self._reply(200, {"service": SERVICE})
            else:
                self._reply(404, {"error": "not found"})

        def do_POST(self) -> None:
            self._reply(405, {"error": "method not allowed"})

        def log_message(self, *args: object) -> None:
            pass

    host = os.environ.get("HOST", "127.0.0.1")
    return ThreadingHTTPServer((host, port), Handler)


def main() -> None:
    """Serve until interrupted."""
    server = make_server(int(os.environ.get("PORT", "8080")), os.environ.get("DATABASE_URL"))
    print(f"{SERVICE} listening on {server.server_address[1]}")
    server.serve_forever()


if __name__ == "__main__":
    main()
