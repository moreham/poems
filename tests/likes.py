"""Exercise actual HTTP requests and SQLite writes without touching production data."""
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import json
from pathlib import Path
import sqlite3
from contextlib import closing
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

spec = importlib.util.spec_from_file_location("poetry_server", Path(__file__).resolve().parents[1] / "tools/public-server.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LikesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "likes.sqlite3"
        self.poem = sorted(module.POEMS)[0]
        self.start_server()

    def start_server(self):
        self.server = module.PoetryServer(("127.0.0.1", 0), self.db)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def tearDown(self):
        self.stop_server()
        self.temp.cleanup()

    def request(self, poem=None, cookie=None, post=False, draw_id="a" * 32, **headers):
        path = "/api/likes"
        data = None
        if post:
            data = json.dumps({"poem": poem or self.poem, "draw_id": draw_id}).encode()
            headers["Content-Type"] = "application/json"
        else:
            path += "?" + urlencode({"poem": poem or self.poem, "draw_id": draw_id})
        if cookie:
            headers["Cookie"] = cookie
        req = Request(self.base + path, data=data, headers=headers)
        with urlopen(req, timeout=15) as response:
            return json.load(response), response.headers.get("Set-Cookie", "").split(";", 1)[0]

    def test_shared_counts_unique_visitors_and_persistence(self):
        empty, cookie_a = self.request()
        self.assertEqual(empty, {"count": 0, "total": 0, "liked": False})
        first, _ = self.request(cookie=cookie_a, post=True)
        self.assertEqual(first, {"count": 1, "total": 1, "liked": True})
        _, cookie_b = self.request()
        second, _ = self.request(cookie=cookie_b, post=True)
        self.assertEqual(second["count"], 2)
        # Concurrent retries by one visitor must count exactly once.
        with ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(lambda _: self.request(cookie=cookie_a, post=True)[0], range(24)))
        self.assertTrue(all(result["count"] == 2 for result in results))
        other = sorted(module.POEMS)[1]
        separate, _ = self.request(poem=other, cookie=cookie_a, post=True)
        self.assertEqual(separate, {"count": 1, "total": 3, "liked": True})
        self.stop_server()
        self.start_server()
        persisted, _ = self.request(cookie=cookie_a)
        self.assertEqual(persisted, {"count": 2, "total": 3, "liked": True})

    def test_same_poem_new_draw_and_retries(self):
        _, cookie = self.request()
        self.request(cookie=cookie, post=True)
        next_draw = "b" * 32
        fresh, _ = self.request(cookie=cookie, draw_id=next_draw)
        self.assertEqual(fresh, {"count": 1, "total": 1, "liked": False})
        with ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(lambda _: self.request(cookie=cookie, post=True, draw_id=next_draw)[0], range(12)))
        self.assertTrue(all(result == {"count": 2, "total": 2, "liked": True} for result in results))
        self.stop_server()
        self.start_server()
        self.assertEqual(self.request(cookie=cookie, draw_id=next_draw)[0],
                         {"count": 2, "total": 2, "liked": True})

    def test_migrates_existing_likes(self):
        self.stop_server()
        with closing(sqlite3.connect(self.db)) as connection, connection:
            connection.execute("DROP TABLE likes")
            connection.execute("""CREATE TABLE likes (poem TEXT NOT NULL, visitor TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (poem, visitor))""")
            connection.execute("INSERT INTO likes (poem, visitor) VALUES (?, ?)", (self.poem, "c" * 32))
        self.start_server()
        cookie = "poem_visitor=" + "c" * 32
        self.assertEqual(self.request(cookie=cookie)[0], {"count": 1, "total": 1, "liked": False})
        self.assertTrue(self.request(cookie=cookie, draw_id="")[0]["liked"])
        self.assertEqual(self.request(cookie=cookie, post=True)[0], {"count": 2, "total": 2, "liked": True})
        self.stop_server()
        self.start_server()
        self.assertEqual(self.request(cookie=cookie)[0]["total"], 2)

    def test_rejects_invalid_requests_and_hides_database(self):
        _, cookie = self.request()
        for kwargs, code in [({"poem": "not-a-poem"}, 400),
                             ({"post": True}, 409),
                             ({"draw_id": "invalid"}, 400),
                             ({"post": True, "cookie": cookie, "draw_id": 42}, 400),
                             ({"post": True, "cookie": cookie, "Origin": "https://other.example"}, 403)]:
            with self.assertRaises(HTTPError) as error:
                self.request(**kwargs)
            self.assertEqual(error.exception.code, code)
            error.exception.close()
        for path in ["/data/likes.sqlite3", "/tools/public-server.py"]:
            with self.assertRaises(HTTPError) as error:
                urlopen(self.base + path)
            self.assertEqual(error.exception.code, 404)
            error.exception.close()
        result, _ = self.request(cookie=cookie)
        self.assertEqual(result["total"], 0)


if __name__ == "__main__":
    unittest.main()
