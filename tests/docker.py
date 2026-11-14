"""Build the image first; verify real container recreation with isolated test data."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import uuid

DOCKER = shutil.which("docker") or str(Path(os.environ.get("LOCALAPPDATA", "")) / "Programs/DockerDesktop/resources/bin/docker.exe")
ROOT = Path(__file__).resolve().parents[1]
POEM = json.loads((ROOT / "app.js").read_text(encoding="utf-8").split("const POEMS = ", 1)[1].split(";", 1)[0])[0]
NAME = "poems-test-" + uuid.uuid4().hex[:12]


def docker(*args):
    return subprocess.check_output([DOCKER, *args], text=True).strip()


def start(directory):
    docker("run", "-d", "--name", NAME, "--read-only", "--cap-drop=ALL",
           "--security-opt=no-new-privileges:true", "--tmpfs", "/tmp",
           "--mount", f"type=bind,source={directory},target=/app/data",
           "-p", "127.0.0.1::8001", "poems:local")
    port = json.loads(docker("inspect", NAME))[0]["NetworkSettings"]["Ports"]["8001/tcp"][0]["HostPort"]
    base = "http://127.0.0.1:" + port
    for attempt in range(40):
        try:
            with urlopen(base, timeout=2) as response:
                assert response.status == 200
            return base
        except OSError:
            time.sleep(0.25)
    raise RuntimeError(docker("logs", NAME))


def request(base, cookie=None, post=False, draw_id="a" * 32):
    headers = {"Cookie": cookie} if cookie else {}
    data = None
    url = base + "/api/likes"
    if post:
        headers["Content-Type"] = "application/json"
        data = json.dumps({"poem": POEM, "draw_id": draw_id}).encode()
    else:
        url += "?" + urlencode({"poem": POEM, "draw_id": draw_id})
    with urlopen(Request(url, data=data, headers=headers), timeout=5) as response:
        return json.load(response), response.headers.get("Set-Cookie")


with tempfile.TemporaryDirectory(prefix="poems-docker-") as directory:
    try:
        # Linux bind mounts must allow the image's unprivileged UID to write.
        if os.name != "nt":
            os.chmod(directory, 0o777)
        base = start(directory)
        initial, cookie = request(base)
        assert initial == {"count": 0, "total": 0, "liked": False}
        cookie = cookie.split(";", 1)[0]
        assert request(base, cookie, True)[0] == {"count": 1, "total": 1, "liked": True}
        assert request(base, cookie, True)[0]["total"] == 1
        docker("rm", "-f", NAME)
        base = start(directory)
        assert request(base, cookie)[0] == {"count": 1, "total": 1, "liked": True}
        assert request(base, cookie, draw_id="b" * 32)[0] == {"count": 1, "total": 1, "liked": False}
        assert request(base, cookie, True, draw_id="b" * 32)[0] == {"count": 2, "total": 2, "liked": True}
        assert Path(directory, "likes.sqlite3").exists()
        assert docker("exec", NAME, "id", "-u") == "10001"
        print("PASS: container HTTP, likes, deduplication, non-root user, persistence after recreation")
    finally:
        subprocess.run([DOCKER, "rm", "-f", NAME], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
