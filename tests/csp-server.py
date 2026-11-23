#!/usr/bin/env python3
"""Zero-dependency Strict-CSP Static HTTP Server for HTML Slide Tool local testing & Playwright CI."""
import argparse
import functools
import http.server
import os
import sys

STRICT_CSP_HEADER = (
    "default-src 'self' data: blob:; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; "
    "img-src 'self' data: blob: https:; "
    "media-src 'self' data: blob: https:; "
    "frame-src https:; "
    "connect-src 'self' https:; "
    "worker-src 'self'; "
    "manifest-src 'self';"
)


class StrictCSPRequestHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".html": "text/html; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def end_headers(self):
        self.send_header("Content-Security-Policy", STRICT_CSP_HEADER)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if os.environ.get("CSP_SERVER_QUIET") == "1":
            return
        super().log_message(fmt, *args)


def main():
    parser = argparse.ArgumentParser(description="HTML Slide Tool Strict-CSP Dev & CI Server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=4173, help="Listen port (default: 4173)")
    parser.add_argument(
        "--dir",
        default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        help="Root directory to serve (default: repository root)",
    )
    args = parser.parse_args()

    handler = functools.partial(StrictCSPRequestHandler, directory=args.dir)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    httpd = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    print(f"[HTML Slide Tool Strict-CSP Server] http://{args.host}:{args.port}/index.html (root: {args.dir})", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
