"""Serve the poetry site and durable, shared likes (Python standard library only)."""
import argparse
from contextlib import closing
from functools import partial
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import sqlite3
from urllib.parse import parse_qs, unquote, urlsplit
import uuid

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = {"index.html", "styles.css", "app.js", "interpretations.js", "likes.js"}
POEMS = frozenset(json.loads((ROOT / "app.js").read_text(encoding="utf-8")
                            .split("const POEMS = ", 1)[1].split(";", 1)[0]))
COOKIE_NAME = "poem_visitor"


class PoetryServer(ThreadingHTTPServer):
    def __init__(self, address, db_path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.db_path)) as connection, connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute("BEGIN IMMEDIATE")
            columns = {row[1] for row in connection.execute("PRAGMA table_info(likes)")}
            legacy = bool(columns) and "draw_id" not in columns
            if legacy:
                connection.execute("ALTER TABLE likes RENAME TO likes_legacy")
            connection.execute("""CREATE TABLE IF NOT EXISTS likes (
                poem TEXT NOT NULL,
                visitor TEXT NOT NULL,
                draw_id TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (poem, visitor, draw_id)
            )""")
            if legacy:
                connection.execute("""INSERT INTO likes (poem, visitor, draw_id, created_at)
                    SELECT poem, visitor, '', created_at FROM likes_legacy""")
                connection.execute("DROP TABLE likes_legacy")
        super().__init__(address, partial(PublicHandler, directory=str(ROOT)))


class PublicHandler(SimpleHTTPRequestHandler):
    def send_json(self, status, payload, cookie=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def visitor(self):
        jar = cookies.SimpleCookie()
        try:
            jar.load(self.headers.get("Cookie", ""))
        except cookies.CookieError:
            pass
        token = jar.get(COOKIE_NAME)
        if token and re.fullmatch(r"[0-9a-f]{32}", token.value):
            return token.value, None
        visitor = uuid.uuid4().hex
        return visitor, f"{COOKIE_NAME}={visitor}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax"

    def likes(self, poem, draw_id="", add=False):
        if not isinstance(poem, str) or poem not in POEMS:
            self.send_json(400, {"error": "无效的诗签"})
            return
        # Empty identifiers support tabs opened before the per-draw update.
        if not isinstance(draw_id, str) or (draw_id and not re.fullmatch(r"[0-9a-f]{32}", draw_id)):
            self.send_json(400, {"error": "无效的抽签标识"})
            return
        visitor, cookie = self.visitor()
        # A write requires the identity issued by GET, so retries never mint new voters.
        if add and cookie:
            self.send_json(409, {"error": "请启用 Cookie 并刷新页面后再点赞"}, cookie)
            return
        try:
            with closing(sqlite3.connect(self.server.db_path, timeout=10)) as connection, connection:
                connection.execute("BEGIN IMMEDIATE" if add else "BEGIN")
                if add:
                    connection.execute("INSERT OR IGNORE INTO likes (poem, visitor, draw_id) VALUES (?, ?, ?)",
                                       (poem, visitor, draw_id))
                count = connection.execute("SELECT COUNT(*) FROM likes WHERE poem = ?", (poem,)).fetchone()[0]
                total = connection.execute("SELECT COUNT(*) FROM likes").fetchone()[0]
                liked = connection.execute("SELECT 1 FROM likes WHERE poem = ? AND visitor = ? AND draw_id = ?",
                                           (poem, visitor, draw_id)).fetchone() is not None
            self.send_json(200, {"count": count, "total": total, "liked": liked}, cookie)
        except sqlite3.Error:
            self.send_json(503, {"error": "点赞服务暂时不可用，请稍后重试"})

    def do_GET(self):
        url = urlsplit(self.path)
        if url.path == "/api/likes":
            query = parse_qs(url.query)
            self.likes(query.get("poem", [None])[0], query.get("draw_id", [""])[0])
        elif url.path.startswith("/api/"):
            self.send_json(404, {"error": "接口不存在"})
        else:
            super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != "/api/likes":
            self.send_json(404, {"error": "接口不存在"})
            return
        origin = self.headers.get("Origin")
        if (self.headers.get("Sec-Fetch-Site") == "cross-site" or
                (origin and urlsplit(origin).netloc != self.headers.get("Host"))):
            self.send_json(403, {"error": "请从本站发起点赞"})
            return
        if self.headers.get_content_type() != "application/json":
            self.send_json(415, {"error": "需要 JSON 请求"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 2048:
                self.send_json(413, {"error": "请求大小无效"})
                return
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("Expected object")
        except (ValueError, UnicodeError):
            self.send_json(400, {"error": "请求格式无效"})
            return
        self.likes(payload.get("poem"), payload.get("draw_id", ""), add=True)

    def send_head(self):
        request_path = unquote(urlsplit(self.path).path).lstrip("/") or "index.html"
        candidate = (ROOT / request_path).resolve()
        try:
            relative = candidate.relative_to(ROOT).as_posix()
        except ValueError:
            self.send_error(404)
            return None
        if not candidate.is_file() or not (
            relative in PUBLIC_FILES or relative.startswith("assets/")
        ):
            self.send_error(404)
            return None
        return super().send_head()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--db", type=Path, default=ROOT / "data" / "likes.sqlite3")
    args = parser.parse_args()
    PoetryServer((args.host, args.port), args.db).serve_forever()
