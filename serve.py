"""Local static server with Unity WebGL (.br) headers."""
from __future__ import annotations

import http.server
import os
import socketserver

PORT = int(os.environ.get("PORT", "3456"))


class Handler(http.server.SimpleHTTPRequestHandler):
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
        clean = self.path.split("?", 1)[0]
        if clean.endswith(".br"):
            self.send_header("Content-Encoding", "br")
        super().end_headers()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with ReusableTCPServer(("", PORT), Handler) as httpd:
        print(f"Serving portfolio at http://localhost:{PORT}")
        print("Unity .br files are served with Content-Encoding: br")
        print("Press Ctrl+C to stop.")
        httpd.serve_forever()
