"""Serve the reviewed static export for local QA only; never bind publicly."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

EXPORT = Path(__file__).resolve().parent.parent / "dist"
if not (EXPORT / "index.html").is_file():
    raise SystemExit("Exporta la aplicación antes de iniciar la verificación web.")


class ExportHandler(SimpleHTTPRequestHandler):
    # Windows registry MIME guesses can classify .mjs as text/plain.
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".wasm": "application/wasm",
        ".pdf": "application/pdf",
    }

    def translate_path(self, path):
        translated = Path(super().translate_path(path))
        if not translated.suffix:
            route = translated.with_suffix(".html")
            if route.is_file() and route.is_relative_to(EXPORT):
                return str(route)
        return str(translated)

    def list_directory(self, path):
        self.send_error(404, "Not found")
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


with ThreadingHTTPServer(("127.0.0.1", 8087), partial(ExportHandler, directory=str(EXPORT))) as server:
    print("Mercado QA: http://localhost:8087", flush=True)
    server.serve_forever()
