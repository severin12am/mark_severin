"""Local static server with Unity WebGL (.br) headers."""
from __future__ import annotations

import http.server
import socketserver

PORT = 3456


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


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving portfolio at http://localhost:{PORT}")
        print("Press Ctrl+C to stop.")
        httpd.serve_forever()
