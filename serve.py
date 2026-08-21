"""Local static server. Prefers Node — Python's http.server wedges on Windows + Chrome."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "3456"))
ROOT = os.path.dirname(os.path.abspath(__file__))


def run_node() -> int | None:
    node = shutil.which("node")
    script = os.path.join(ROOT, "serve.mjs")
    if not node or not os.path.isfile(script):
        return None
    env = os.environ.copy()
    env["PORT"] = str(PORT)
    return subprocess.call([node, script], cwd=ROOT, env=env)


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

    def guess_type(self, path: str) -> str:
        if path.endswith(".wasm.br"):
            return "application/wasm"
        if path.endswith(".js.br"):
            return "application/javascript"
        if path.endswith(".data.br"):
            return "application/octet-stream"
        if path.endswith(".wasm"):
            return "application/wasm"
        return super().guess_type(path)

    def end_headers(self) -> None:
        self.send_header("Connection", "close")
        clean = self.path.split("?", 1)[0]
        if clean.endswith(".br"):
            self.send_header("Content-Encoding", "br")
        if clean.endswith((".html", ".js", ".css")) or clean.endswith("/") or "SaveBruge" in clean:
            self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        if "favicon.ico" in str(args[:1]):
            return
        super().log_message(format, *args)


class Server(ThreadingHTTPServer):
    allow_reuse_address = os.name != "nt"
    daemon_threads = True
    block_on_close = False
    request_queue_size = 128


if __name__ == "__main__":
    os.chdir(ROOT)
    code = run_node()
    if code is not None:
        raise SystemExit(code)
    with Server(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Serving portfolio at http://127.0.0.1:{PORT}", flush=True)
        print("Unity .br files are served with Content-Encoding: br", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        httpd.serve_forever()
