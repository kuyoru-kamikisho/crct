#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""角色投票服务（Python 3.9+ 标准库，无需安装数据库或第三方包）。

启动：
    python app.py
    python app.py --host 0.0.0.0 --port 8787

数据存在同目录 data/votes.db（SQLite WAL）。角色名单自动扫描
promilia_tools/src/data/characters/*.js，新增角色文件后无需改服务代码。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "votes.db"
CHAR_DIR = ROOT.parent / "promilia_tools" / "src" / "data" / "characters"

TZ_SHANGHAI = timezone(timedelta(hours=8))
MAX_SELECT = 5
MAX_BODY = 16 * 1024
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{16,80}$")
FINGERPRINT_RE = re.compile(r"^[a-f0-9]{32,128}$")
CHAR_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")
CHAR_FILE_ID_RE = re.compile(
    r"""^\s*id:\s*["']([a-z0-9][a-z0-9-]{1,62})["']\s*,?\s*$""",
    re.M,
)

CATEGORIES = (
    "favorite",
    "output",
    "shieldbreak",
    "heal",
    "support",
    "ecchi",
)

WRITE_LOCK = threading.Lock()
CHAR_CACHE = {"ids": frozenset(), "mtime": -1.0, "checked": 0.0}
LOCAL = threading.local()
RATE = None


def today_str() -> str:
    return datetime.now(TZ_SHANGHAI).date().isoformat()


def now_iso() -> str:
    return datetime.now(TZ_SHANGHAI).replace(microsecond=0).isoformat()


def load_character_ids() -> frozenset[str]:
    now = time.time()
    if now - CHAR_CACHE["checked"] < 15:
        return CHAR_CACHE["ids"]
    CHAR_CACHE["checked"] = now
    if not CHAR_DIR.is_dir():
        return CHAR_CACHE["ids"]
    latest = 0.0
    files = list(CHAR_DIR.glob("*.js"))
    for path in files:
        try:
            latest = max(latest, path.stat().st_mtime)
        except OSError:
            continue
    if latest == CHAR_CACHE["mtime"] and CHAR_CACHE["ids"]:
        return CHAR_CACHE["ids"]
    ids = []
    for path in files:
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        match = CHAR_FILE_ID_RE.search(text)
        if match:
            ids.append(match.group(1))
    CHAR_CACHE["ids"] = frozenset(ids)
    CHAR_CACHE["mtime"] = latest
    return CHAR_CACHE["ids"]


def connect() -> sqlite3.Connection:
    conn = getattr(LOCAL, "conn", None)
    if conn is not None:
        return conn
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute("PRAGMA cache_size=-8000")
    conn.execute("PRAGMA foreign_keys=ON")
    LOCAL.conn = conn
    return conn


def init_db() -> None:
    conn = connect()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS ballots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL,
            fingerprint TEXT NOT NULL,
            ip TEXT,
            category TEXT NOT NULL,
            vote_date TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(token, category, vote_date)
        );
        CREATE TABLE IF NOT EXISTS ballot_items (
            ballot_id INTEGER NOT NULL,
            character_id TEXT NOT NULL,
            PRIMARY KEY (ballot_id, character_id),
            FOREIGN KEY (ballot_id) REFERENCES ballots(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS daily_counts (
            category TEXT NOT NULL,
            character_id TEXT NOT NULL,
            vote_date TEXT NOT NULL,
            votes INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (category, character_id, vote_date)
        );
        CREATE TABLE IF NOT EXISTS fingerprint_ballots (
            fingerprint TEXT NOT NULL,
            category TEXT NOT NULL,
            vote_date TEXT NOT NULL,
            PRIMARY KEY (fingerprint, category, vote_date)
        );
        CREATE INDEX IF NOT EXISTS idx_ballots_ip_date ON ballots(ip, vote_date);
        CREATE INDEX IF NOT EXISTS idx_counts_cat_date ON daily_counts(category, vote_date);
        """
    )


DEMO_DAYS = 7
DEMO_DAILY_MAX = 10


def demo_daily_votes(category: str, character_id: str, vote_date: str) -> int:
    digest = hashlib.md5(f"promilia-demo|{category}|{character_id}|{vote_date}".encode("utf-8")).digest()
    return digest[0] % (DEMO_DAILY_MAX + 1)


def seed_demo_counts() -> int:
    ids = sorted(load_character_ids())
    if not ids:
        return 0
    today = datetime.now(TZ_SHANGHAI).date()
    conn = connect()
    inserted = 0
    with WRITE_LOCK:
        conn.execute("BEGIN IMMEDIATE")
        try:
            for offset in range(DEMO_DAYS):
                day = (today - timedelta(days=DEMO_DAYS - 1 - offset)).isoformat()
                for category in CATEGORIES:
                    for cid in ids:
                        votes = demo_daily_votes(category, cid, day)
                        cur = conn.execute(
                            """
                            INSERT INTO daily_counts (category, character_id, vote_date, votes)
                            VALUES (?, ?, ?, ?)
                            ON CONFLICT(category, character_id, vote_date) DO NOTHING
                            """,
                            (category, cid, day, votes),
                        )
                        inserted += cur.rowcount or 0
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise
    return inserted


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window: float) -> bool:
        now = time.time()
        with self._lock:
            q = self._hits[key]
            cutoff = now - window
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            return True


def fail(code: str, message: str, **extra) -> dict:
    payload = {"ok": False, "code": code, "message": message}
    payload.update(extra)
    return payload


def client_ip(handler: BaseHTTPRequestHandler) -> str:
    forwarded = handler.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    real = handler.headers.get("X-Real-IP")
    if real:
        return real.strip()[:64]
    return (handler.client_address[0] or "")[:64]


def read_identity(handler: BaseHTTPRequestHandler) -> tuple[str, str] | dict:
    token = (handler.headers.get("X-Voter-Token") or "").strip()
    fingerprint = (handler.headers.get("X-Device-Fingerprint") or "").strip().lower()
    if not TOKEN_RE.match(token):
        return fail("INVALID_TOKEN", "missing or invalid voter token")
    if not FINGERPRINT_RE.match(fingerprint):
        return fail("INVALID_FINGERPRINT", "missing or invalid device fingerprint")
    return token, fingerprint


def status_payload(category: str, token: str) -> dict:
    if category not in CATEGORIES:
        return fail("INVALID_CATEGORY", "unknown category")
    date = today_str()
    conn = connect()
    row = conn.execute(
        "SELECT id FROM ballots WHERE token=? AND category=? AND vote_date=?",
        (token, category, date),
    ).fetchone()
    voted_ids: list[str] = []
    if row:
        voted_ids = [
            r["character_id"]
            for r in conn.execute(
                "SELECT character_id FROM ballot_items WHERE ballot_id=? ORDER BY character_id",
                (row["id"],),
            )
        ]
    return {
        "ok": True,
        "date": date,
        "category": category,
        "voted": bool(row),
        "character_ids": voted_ids,
        "max_select": MAX_SELECT,
        "categories": list(CATEGORIES),
    }


def rank_payload(category: str) -> dict:
    if category not in CATEGORIES:
        return fail("INVALID_CATEGORY", "unknown category")
    conn = connect()
    rows = conn.execute(
        """
        SELECT character_id AS id, SUM(votes) AS total
        FROM daily_counts
        WHERE category=?
        GROUP BY character_id
        ORDER BY total DESC, character_id ASC
        """,
        (category,),
    ).fetchall()
    return {
        "ok": True,
        "category": category,
        "ranking": [{"id": r["id"], "total": int(r["total"])} for r in rows],
    }


def hexagon_payload() -> dict:
    conn = connect()
    rows = conn.execute(
        """
        SELECT character_id AS id, category, SUM(votes) AS total
        FROM daily_counts
        GROUP BY character_id, category
        """
    ).fetchall()
    by_id: dict[str, dict[str, int]] = {}
    for row in rows:
        cat = row["category"]
        if cat not in CATEGORIES:
            continue
        bucket = by_id.setdefault(row["id"], {c: 0 for c in CATEGORIES})
        bucket[cat] = int(row["total"])
    ids = list(load_character_ids()) or list(by_id.keys())
    extra = [cid for cid in by_id if cid not in ids]
    characters = []
    for cid in [*ids, *extra]:
        scores = by_id.get(cid) or {c: 0 for c in CATEGORIES}
        for cat in CATEGORIES:
            scores.setdefault(cat, 0)
        total = sum(scores[c] for c in CATEGORIES)
        characters.append({"id": cid, "scores": scores, "total": total})
    characters.sort(key=lambda item: (-item["total"], item["id"]))
    return {
        "ok": True,
        "categories": list(CATEGORIES),
        "characters": characters,
    }


def trend_payload(category: str, granularity: str) -> dict:
    if category not in CATEGORIES:
        return fail("INVALID_CATEGORY", "unknown category")
    gran = "month" if granularity == "month" else "day"
    conn = connect()
    if gran == "month":
        rows = conn.execute(
            """
            SELECT character_id AS id, substr(vote_date, 1, 7) AS period, SUM(votes) AS count
            FROM daily_counts
            WHERE category=?
            GROUP BY character_id, period
            ORDER BY period ASC, character_id ASC
            """,
            (category,),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT character_id AS id, vote_date AS period, votes AS count
            FROM daily_counts
            WHERE category=?
            ORDER BY vote_date ASC, character_id ASC
            """,
            (category,),
        ).fetchall()
    series: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        series[row["id"]].append({"period": row["period"], "count": int(row["count"])})
    return {
        "ok": True,
        "category": category,
        "granularity": gran,
        "series": [{"id": cid, "points": points} for cid, points in series.items()],
    }


def submit_vote(token: str, fingerprint: str, ip: str, category: str, character_ids: list[str]) -> dict:
    if category not in CATEGORIES:
        return fail("INVALID_CATEGORY", "unknown category")
    ids: list[str] = []
    seen: set[str] = set()
    for raw in character_ids:
        cid = str(raw).strip()
        if cid in seen:
            continue
        if not CHAR_ID_RE.match(cid):
            return fail("INVALID_IDS", "invalid character id")
        seen.add(cid)
        ids.append(cid)
    if not ids:
        return fail("EMPTY", "select at least one character")
    if len(ids) > MAX_SELECT:
        return fail("TOO_MANY", f"at most {MAX_SELECT} characters")

    known = load_character_ids()
    if known:
        unknown = [cid for cid in ids if cid not in known]
        if unknown:
            return fail("UNKNOWN_CHARACTER", "character is not in the current roster", ids=unknown)

    date = today_str()
    with WRITE_LOCK:
        conn = connect()
        conn.execute("BEGIN IMMEDIATE")
        try:
            existed = conn.execute(
                "SELECT id FROM ballots WHERE token=? AND category=? AND vote_date=?",
                (token, category, date),
            ).fetchone()
            if existed:
                conn.execute("ROLLBACK")
                return fail("ALREADY_VOTED", "already voted today")

            fp_hit = conn.execute(
                "SELECT 1 FROM fingerprint_ballots WHERE fingerprint=? AND category=? AND vote_date=?",
                (fingerprint, category, date),
            ).fetchone()
            if fp_hit:
                conn.execute("ROLLBACK")
                return fail("DEVICE_ALREADY_VOTED", "this device already voted today")

            cur = conn.execute(
                """
                INSERT INTO ballots (token, fingerprint, ip, category, vote_date, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (token, fingerprint, ip, category, date, now_iso()),
            )
            ballot_id = cur.lastrowid
            for cid in ids:
                conn.execute(
                    "INSERT INTO ballot_items (ballot_id, character_id) VALUES (?, ?)",
                    (ballot_id, cid),
                )
                conn.execute(
                    """
                    INSERT INTO daily_counts (category, character_id, vote_date, votes)
                    VALUES (?, ?, ?, 1)
                    ON CONFLICT(category, character_id, vote_date)
                    DO UPDATE SET votes = votes + 1
                    """,
                    (category, cid, date),
                )
            conn.execute(
                """
                INSERT INTO fingerprint_ballots (fingerprint, category, vote_date)
                VALUES (?, ?, ?)
                """,
                (fingerprint, category, date),
            )
            conn.execute("COMMIT")
        except sqlite3.IntegrityError:
            conn.execute("ROLLBACK")
            return fail("ALREADY_VOTED", "already voted today")
        except Exception:
            conn.execute("ROLLBACK")
            raise

    result = rank_payload(category)
    result["voted"] = True
    result["character_ids"] = ids
    result["date"] = date
    return result


INDEX_HTML = """<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Promilia Vote Service</title>
  <style>
    body { font-family: sans-serif; background:#071018; color:#d8ebe8; margin:40px; }
    code { color:#7ed4c0; }
    a { color:#3ecfcf; }
  </style>
</head>
<body>
  <h1>Promilia 角色投票服务</h1>
  <p>服务已启动。前端页面请打开 Wiki 的「角色排名」。</p>
  <p>健康检查：<a href="/api/health">/api/health</a></p>
</body>
</html>
"""


class VoteHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _cors(self) -> None:
        origin = self.headers.get("Origin") or "*"
        self.send_header("Access-Control-Allow-Origin", origin if origin else "*")
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Voter-Token, X-Device-Fingerprint")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Max-Age", "600")

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        code = status
        if not payload.get("ok", True) and status == 200:
            mapping = {
                "INVALID_TOKEN": 400,
                "INVALID_FINGERPRINT": 400,
                "INVALID_CATEGORY": 400,
                "INVALID_IDS": 400,
                "EMPTY": 400,
                "TOO_MANY": 400,
                "UNKNOWN_CHARACTER": 400,
                "TOO_LARGE": 413,
                "RATE_LIMITED": 429,
                "ALREADY_VOTED": 409,
                "DEVICE_ALREADY_VOTED": 409,
                "NOT_FOUND": 404,
            }
            code = mapping.get(payload.get("code"), 400)
        self._send(code, body, "application/json; charset=utf-8")

    def _html(self, text: str) -> None:
        self._send(200, text.encode("utf-8"), "text/html; charset=utf-8")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        qs = parse_qs(parsed.query)
        if path == "/":
            return self._html(INDEX_HTML)
        if path == "/api/health":
            ids = load_character_ids()
            return self._json(
                {
                    "ok": True,
                    "service": "promilia-vote",
                    "date": today_str(),
                    "characters": len(ids),
                    "db": str(DB_PATH),
                }
            )
        if path == "/api/meta":
            return self._json(
                {
                    "ok": True,
                    "categories": list(CATEGORIES),
                    "max_select": MAX_SELECT,
                    "characters": sorted(load_character_ids()),
                }
            )

        category = (qs.get("category") or ["favorite"])[0]
        if path == "/api/rank":
            return self._json(rank_payload(category))
        if path == "/api/hexagon":
            return self._json(hexagon_payload())
        if path == "/api/trend":
            gran = (qs.get("granularity") or ["day"])[0]
            return self._json(trend_payload(category, gran))
        if path == "/api/status":
            identity = read_identity(self)
            if isinstance(identity, dict):
                return self._json(identity)
            token, _fp = identity
            return self._json(status_payload(category, token))
        return self._json(fail("NOT_FOUND", "not found"), 404)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        if path != "/api/vote":
            return self._json(fail("NOT_FOUND", "not found"), 404)

        ip = client_ip(self)
        if RATE and not RATE.allow(f"vote:{ip}", 240, 60):
            return self._json(fail("RATE_LIMITED", "too many requests"))

        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            return self._json(fail("TOO_LARGE", "payload too large"), 413)
        raw = self.rfile.read(max(length, 0)) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
        except (UnicodeDecodeError, json.JSONDecodeError):
            return self._json(fail("INVALID_IDS", "invalid json"))
        if not isinstance(data, dict):
            return self._json(fail("INVALID_IDS", "invalid json"))

        identity = read_identity(self)
        if isinstance(identity, dict):
            return self._json(identity)
        token, fingerprint = identity
        category = str(data.get("category") or "favorite")
        ids = data.get("character_ids") or []
        if not isinstance(ids, list):
            return self._json(fail("INVALID_IDS", "character_ids must be a list"))
        try:
            return self._json(submit_vote(token, fingerprint, ip, category, ids))
        except Exception as exc:
            sys.stderr.write(f"vote error: {exc}\n")
            return self._json({"ok": False, "code": "FAIL", "message": "internal error"}, 500)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.log_date_time_string(), fmt % args))


def main() -> None:
    global RATE
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="Promilia character vote service")
    parser.add_argument("--host", default=os.environ.get("VOTE_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("VOTE_PORT", "8787")))
    args = parser.parse_args()

    init_db()
    load_character_ids()
    seeded = seed_demo_counts()
    RATE = RateLimiter()

    httpd = ThreadingHTTPServer((args.host, args.port), VoteHandler)
    n_chars = len(CHAR_CACHE["ids"])
    print(f"Promilia vote service  http://{args.host}:{args.port}", flush=True)
    print(f"SQLite  {DB_PATH}", flush=True)
    print(f"Characters  {n_chars} from {CHAR_DIR}", flush=True)
    if seeded:
        print(f"Demo votes  seeded {seeded} daily rows (7 days, 0-{DEMO_DAILY_MAX} per character)", flush=True)
    print("Ctrl+C to stop", flush=True)
    try:
        httpd.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        print("\nbye")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
