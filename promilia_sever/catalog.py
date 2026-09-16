#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""角色 / 物品 / 奇波图鉴 SQLite。

数据文件（均在 data/ 下）：
    characters.db
    items.db
    qibos.db

每条记录以完整 JSON 对象存放，接口按 sort_order 返回数组。
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
TOOLS_DATA = ROOT.parent / "promilia_tools" / "src" / "data"

CHARACTERS_DB = DATA_DIR / "characters.db"
ITEMS_DB = DATA_DIR / "items.db"
QIBOS_DB = DATA_DIR / "qibos.db"

KINDS = ("characters", "items", "qibos")
DB_PATHS = {
    "characters": CHARACTERS_DB,
    "items": ITEMS_DB,
    "qibos": QIBOS_DB,
}
TABLES = {
    "characters": "characters",
    "items": "items",
    "qibos": "qibos",
}

COMMENT_RE = re.compile(r"/\*[\s\S]*?\*/")
LINE_COMMENT_RE = re.compile(r"(^|[^:\"'])//.*?$", re.M)
KEY_RE = re.compile(r"([{\[,]\s*)([A-Za-z_$][\w$]*)\s*:")
TRAIL_COMMA_RE = re.compile(r",\s*([}\]])")

WRITE_LOCK = threading.Lock()
LOCAL = threading.local()
CACHE = {
    kind: {"items": None, "mtime": -1.0, "checked": 0.0, "ids": frozenset()}
    for kind in KINDS
}


def parse_js_export_default(text: str):
    cleaned = COMMENT_RE.sub("", text)
    cleaned = LINE_COMMENT_RE.sub(r"\1", cleaned)
    idx = cleaned.find("export default")
    if idx < 0:
        return None
    expr = cleaned[idx + len("export default") :].strip().rstrip(";")
    expr = KEY_RE.sub(r'\1"\2":', expr)
    expr = TRAIL_COMMA_RE.sub(r"\1", expr)
    try:
        return json.loads(expr)
    except json.JSONDecodeError:
        return None


def load_js_dir(directory: Path) -> list[dict]:
    if not directory.is_dir():
        return []
    items = []
    failed = []
    for path in sorted(directory.glob("*.js")):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            failed.append(path.name)
            continue
        data = parse_js_export_default(text)
        if isinstance(data, dict) and data.get("id"):
            items.append(data)
        else:
            failed.append(path.name)
    if failed:
        sys.stderr.write(f"catalog parse failed ({directory.name}): {', '.join(failed)}\n")
    return items


def load_character_order() -> list[str]:
    path = TOOLS_DATA / "characterOrder.js"
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return []
    return re.findall(r"['\"]([a-z0-9][a-z0-9-]*)['\"]", text)


def parse_qibo_no(no):
    text = str(no or "")
    match = re.match(r"^(\d+)([A-Za-z]*)$", text)
    if not match:
        return (10**18, text)
    return (int(match.group(1)), match.group(2) or "")


def sort_characters(items: list[dict]) -> list[dict]:
    order = load_character_order()
    by_id = {item["id"]: item for item in items}
    ordered = [by_id[cid] for cid in order if cid in by_id]
    extras = sorted(
        (item for item in items if item["id"] not in order),
        key=lambda item: str(item.get("name") or item["id"]),
    )
    return [*ordered, *extras]


def sort_qibos(items: list[dict]) -> list[dict]:
    return sorted(items, key=lambda item: (*parse_qibo_no(item.get("no")), str(item.get("name") or "")))


def sort_items(items: list[dict]) -> list[dict]:
    return sorted(
        items,
        key=lambda item: (-int(item.get("rarity") or 0), str(item.get("name") or item["id"])),
    )


def sort_kind(kind: str, items: list[dict]) -> list[dict]:
    if kind == "characters":
        return sort_characters(items)
    if kind == "qibos":
        return sort_qibos(items)
    return sort_items(items)


def db_path(kind: str) -> Path:
    if kind not in DB_PATHS:
        raise KeyError(kind)
    return DB_PATHS[kind]


def connect(kind: str) -> sqlite3.Connection:
    pool = getattr(LOCAL, "conns", None)
    if pool is None:
        pool = {}
        LOCAL.conns = pool
    conn = pool.get(kind)
    if conn is not None:
        return conn
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path(kind)), check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute("PRAGMA cache_size=-8000")
    pool[kind] = conn
    return conn


def init_schema(kind: str) -> None:
    table = TABLES[kind]
    conn = connect(kind)
    conn.executescript(
        f"""
        CREATE TABLE IF NOT EXISTS {table} (
            id TEXT PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            payload TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_{table}_sort ON {table}(sort_order, id);
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        """
    )


def _decode_row(row: sqlite3.Row) -> dict | None:
    try:
        data = json.loads(row["payload"])
    except (TypeError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    data.setdefault("id", row["id"])
    return data


def _file_mtime(kind: str) -> float:
    path = db_path(kind)
    try:
        return path.stat().st_mtime
    except OSError:
        return -1.0


def invalidate(kind: str | None = None) -> None:
    kinds = KINDS if kind is None else (kind,)
    for name in kinds:
        CACHE[name]["items"] = None
        CACHE[name]["mtime"] = -1.0
        CACHE[name]["checked"] = 0.0
        CACHE[name]["ids"] = frozenset()


def list_all(kind: str, *, force: bool = False) -> list[dict]:
    now = time.time()
    cache = CACHE[kind]
    latest = _file_mtime(kind)
    if (
        not force
        and cache["items"] is not None
        and latest == cache["mtime"]
        and now - cache["checked"] < 15
    ):
        return cache["items"]
    cache["checked"] = now
    if not force and cache["items"] is not None and latest == cache["mtime"]:
        return cache["items"]

    init_schema(kind)
    table = TABLES[kind]
    conn = connect(kind)
    rows = conn.execute(f"SELECT id, payload FROM {table} ORDER BY sort_order ASC, id ASC").fetchall()
    items = []
    for row in rows:
        data = _decode_row(row)
        if data:
            items.append(data)
    cache["items"] = items
    cache["mtime"] = latest
    cache["ids"] = frozenset(item["id"] for item in items)
    return items


def list_ids(kind: str) -> frozenset[str]:
    list_all(kind)
    return CACHE[kind]["ids"]


def get_by_id(kind: str, entity_id: str) -> dict | None:
    cid = str(entity_id or "").strip()
    if not cid:
        return None
    init_schema(kind)
    table = TABLES[kind]
    conn = connect(kind)
    row = conn.execute(f"SELECT id, payload FROM {table} WHERE id=?", (cid,)).fetchone()
    if not row:
        return None
    return _decode_row(row)


def brief_entity(kind: str, item: dict | None) -> dict | None:
    if not item:
        return None
    out = {"id": item.get("id"), "name": item.get("name") or item.get("id")}
    if kind == "qibos":
        out["no"] = item.get("no")
        out["image"] = item.get("image")
    elif kind == "items":
        out["image"] = item.get("image")
        out["rarity"] = item.get("rarity")
    elif kind == "characters":
        out["nameEn"] = item.get("nameEn") or ""
    return out


def neighbors(kind: str, entity_id: str, items: list[dict] | None = None) -> tuple[dict | None, dict | None]:
    rows = items if items is not None else list_all(kind)
    idx = next((i for i, item in enumerate(rows) if item.get("id") == entity_id), -1)
    if idx < 0:
        return None, None
    prev = rows[idx - 1] if idx > 0 else None
    nxt = rows[idx + 1] if idx + 1 < len(rows) else None
    return brief_entity(kind, prev), brief_entity(kind, nxt)


def counts() -> dict[str, int]:
    return {kind: len(list_all(kind)) for kind in KINDS}


def source_mtime() -> float:
    latest = 0.0
    for kind in KINDS:
        latest = max(latest, _file_mtime(kind))
    return latest


def replace_all(kind: str, items: list[dict]) -> int:
    ordered = sort_kind(kind, [item for item in items if isinstance(item, dict) and item.get("id")])
    table = TABLES[kind]
    with WRITE_LOCK:
        init_schema(kind)
        conn = connect(kind)
        conn.execute("BEGIN IMMEDIATE")
        try:
            conn.execute(f"DELETE FROM {table}")
            conn.executemany(
                f"INSERT INTO {table} (id, sort_order, payload) VALUES (?, ?, ?)",
                [
                    (item["id"], index, json.dumps(item, ensure_ascii=False, separators=(",", ":")))
                    for index, item in enumerate(ordered)
                ],
            )
            conn.execute(
                "INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)",
                ("updated_at", str(int(time.time()))),
            )
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise
    invalidate(kind)
    return len(ordered)


def upsert_many(kind: str, items: list[dict]) -> dict:
    incoming = [item for item in items if isinstance(item, dict) and item.get("id")]
    current = {item["id"]: item for item in list_all(kind, force=True)}
    written = 0
    unchanged = 0
    for item in incoming:
        prev = current.get(item["id"])
        if prev == item:
            unchanged += 1
            continue
        current[item["id"]] = item
        written += 1
    if written:
        replace_all(kind, list(current.values()))
    return {"written": written, "unchanged": unchanged, "total": len(current)}


def prune(kind: str, keep_ids: set[str]) -> int:
    current = list_all(kind, force=True)
    kept = [item for item in current if item.get("id") in keep_ids]
    removed = len(current) - len(kept)
    if removed:
        replace_all(kind, kept)
    return removed


def import_from_js() -> dict[str, int]:
    stats = {}
    mapping = {
        "characters": TOOLS_DATA / "characters",
        "qibos": TOOLS_DATA / "qibos",
        "items": TOOLS_DATA / "items",
    }
    for kind, directory in mapping.items():
        items = load_js_dir(directory)
        if not items:
            existing = len(list_all(kind, force=True))
            sys.stderr.write(f"skip {kind}: no JS files in {directory} (keep {existing} rows)\n")
            stats[kind] = existing
            continue
        stats[kind] = replace_all(kind, items)
    return stats


def dump_json(kind: str) -> str:
    return json.dumps(list_all(kind, force=True), ensure_ascii=False, separators=(",", ":"))


def read_json_input(raw: str):
    data = json.loads(raw or "[]")
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return data
    raise ValueError("json must be an object or array")


def main() -> None:
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="Promilia catalog SQLite")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("import-js", help="从前端 src/data 的 JS 文件导入三个库")
    dump_p = sub.add_parser("dump", help="把某个图鉴以 JSON 数组打印到 stdout")
    dump_p.add_argument("kind", choices=KINDS)
    upsert_p = sub.add_parser("upsert", help="从 stdin 读入 JSON 对象/数组并写入")
    upsert_p.add_argument("kind", choices=KINDS)
    prune_p = sub.add_parser("prune", help="只保留指定 id")
    prune_p.add_argument("kind", choices=KINDS)
    prune_p.add_argument("--keep-ids", default="", help="逗号分隔的 id 列表")
    count_p = sub.add_parser("count", help="打印各库条数")
    count_p.add_argument("kind", nargs="?", choices=KINDS)

    args = parser.parse_args()
    if args.cmd == "import-js":
        stats = import_from_js()
        print(
            f"imported characters={stats['characters']} qibos={stats['qibos']} items={stats['items']}",
            flush=True,
        )
        return
    if args.cmd == "dump":
        sys.stdout.write(dump_json(args.kind))
        return
    if args.cmd == "upsert":
        payload = read_json_input(sys.stdin.read())
        result = upsert_many(args.kind, payload)
        print(json.dumps(result, ensure_ascii=False), flush=True)
        return
    if args.cmd == "prune":
        keep = {item.strip() for item in str(args.keep_ids or "").split(",") if item.strip()}
        if not keep and not sys.stdin.isatty():
            payload = json.loads(sys.stdin.read() or "[]")
            if isinstance(payload, list):
                keep = {str(item).strip() for item in payload if str(item).strip()}
        removed = prune(args.kind, keep)
        print(json.dumps({"removed": removed, "kept": len(keep)}, ensure_ascii=False), flush=True)
        return
    if args.cmd == "count":
        if args.kind:
            print(len(list_all(args.kind, force=True)), flush=True)
        else:
            print(json.dumps(counts(), ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
