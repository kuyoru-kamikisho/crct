#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""站内搜索 / 导航索引。使用独立的 data/search.db，不与 votes.db 共用。"""

from __future__ import annotations

import json
import re
import sqlite3
import threading
import time
from pathlib import Path

from catalog import list_all as load_catalog, source_mtime as catalog_mtime

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
SEARCH_DB_PATH = DATA_DIR / "search.db"

ALL_ITEMS_SOURCE_ID = "items"
ALL_ITEMS_SOURCE_NAME = "物品图鉴"

HOME_STATION_RULES = (
    ("home-cuisine", "家园料理", "food", re.compile(r"家园[-·]?(料理铺|烹饪锅)")),
    ("home-workshop", "家园工坊", "workshop", re.compile(r"家园[-·]?(工作室|工作台)")),
    ("home-textile", "家园纺织", "textile", re.compile(r"家园[-·]?(纺车|纺织铺)")),
    ("home-mill", "家园磨坊", "mill", re.compile(r"家园[-·]?磨坊")),
    ("home-ranch", "家园牧场", "ranch", re.compile(r"家园牧场")),
    ("home-farm", "家园种植", "farm", re.compile(r"^家园种植")),
    ("home-smelt", "家园熔炼", "workshop", re.compile(r"家园[-·]?(熔炼铺|熔炉)")),
    ("home-alchemy", "家园炼金", "workshop", re.compile(r"家园[-·]?(炼金台|共鸣石台)")),
    ("home-brick", "家园制砖", "workshop", re.compile(r"家园[-·]?(制砖铺|砖窑)")),
    ("home-sawmill", "家园锯木", "workshop", re.compile(r"家园[-·]?(锯木铺|锯木台)")),
    ("home-leather", "家园制革", "workshop", re.compile(r"家园[-·]?(制革铺|制革台)")),
)

STATIC_NAV = (
    {
        "id": "encyclopedia",
        "label_key": "nav.encyclopedia",
        "icon": "encyclopedia",
        "children": (
            {"id": "characters", "label_key": "nav.characters", "path": "/encyclopedia/characters", "icon": "characters"},
            {"id": "qibo", "label_key": "nav.qibo", "path": "/encyclopedia/qibo", "icon": "qibo"},
            {"id": "achievements", "label_key": "nav.achievements", "path": "/encyclopedia/achievements", "icon": "achievements"},
            {"id": "affixes", "label_key": "nav.affixes", "path": "/encyclopedia/affixes", "icon": "affixes"},
        ),
    },
    {
        "id": "guides",
        "label_key": "nav.guides",
        "icon": "guides",
        "children": (
            {"id": "guide-character", "label_key": "nav.guideCharacter", "path": "/guides/character", "icon": "guide-character"},
            {"id": "guide-qibo", "label_key": "nav.guideQibo", "path": "/guides/qibo", "icon": "guide-qibo"},
            {"id": "guide-farm", "label_key": "nav.guideFarm", "path": "/guides/farm", "icon": "guide-farm"},
            {"id": "guide-puzzle", "label_key": "nav.guidePuzzle", "path": "/guides/puzzle", "icon": "guide-puzzle"},
            {"id": "guide-event", "label_key": "nav.guideEvent", "path": "/guides/event", "icon": "guide-event"},
        ),
    },
    {
        "id": "story",
        "label_key": "nav.story",
        "icon": "story",
        "children": (
            {"id": "story-main", "label_key": "nav.storyMain", "path": "/story/main", "icon": "story-main"},
            {"id": "story-side", "label_key": "nav.storySide", "path": "/story/side", "icon": "story-side"},
        ),
    },
    {
        "id": "tools",
        "label_key": "nav.tools",
        "icon": "tools",
        "children": (
            {"id": "character-rank", "label_key": "nav.characterRank", "path": "/tools/rank", "icon": "character-rank"},
            {"id": "gacha", "label_key": "nav.gacha", "path": "/tools/gacha", "icon": "gacha"},
            {"id": "team-calc", "label_key": "nav.teamCalc", "path": "/tools/team", "icon": "team-calc"},
            {"id": "map-tool", "label_key": "nav.mapTool", "path": "/tools/map", "icon": "map-tool"},
        ),
    },
    {
        "id": "contribute",
        "label_key": "nav.contribute",
        "icon": "contribute",
        "children": ({"id": "contribute", "label_key": "nav.contribute", "path": "/contribute", "icon": "contribute"},),
    },
)

PAGE_LABELS = {
    "nav.home": ("首页", "Home ホーム 홈"),
    "nav.encyclopedia": ("图鉴", "Encyclopedia 図鑑 도감"),
    "nav.characters": ("角色图鉴", "Characters キャラ 캐릭터"),
    "nav.qibo": ("奇波图鉴", "Qibo 奇波 키보"),
    "nav.items": ("物品图鉴", "Items アイテム 아이템"),
    "nav.achievements": ("成就图鉴", "Achievements 実績 업적"),
    "nav.affixes": ("词条图鉴", "Affixes オプション 옵션"),
    "nav.guides": ("攻略", "Guides 攻略 공략"),
    "nav.guideCharacter": ("角色攻略", "Character guide"),
    "nav.guideQibo": ("奇波抓取攻略", "Qibo guide"),
    "nav.guideFarm": ("农场攻略", "Farm guide"),
    "nav.guidePuzzle": ("解谜攻略", "Puzzle guide"),
    "nav.guideEvent": ("活动攻略", "Event guide"),
    "nav.story": ("剧情", "Story ストーリー 스토리"),
    "nav.storyMain": ("主线剧情", "Main story"),
    "nav.storySide": ("支线剧情", "Side story"),
    "nav.tools": ("小游戏", "Tools ミニゲーム 미니게임"),
    "nav.characterRank": ("角色排名", "Character rank"),
    "nav.gacha": ("抽卡模拟器", "Gacha"),
    "nav.teamCalc": ("配队计算器", "Team calc"),
    "nav.mapTool": ("大地图工具", "Map"),
    "nav.contribute": ("欢迎参与", "Contribute 参加 참여"),
}

WRITE_LOCK = threading.Lock()
LOCAL = threading.local()
CACHE = {
    "docs": [],
    "nav": {},
    "source_mtime": -1.0,
    "checked": 0.0,
}


def normalize(value) -> str:
    return re.sub(r"\s+", "", str(value or "")).lower()


def unique_join(parts) -> str:
    seen = []
    for part in parts:
        text = str(part or "").strip()
        if text and text not in seen:
            seen.append(text)
    return " ".join(seen)


def collect_strings(value, out=None):
    if out is None:
        out = []
    if value is None or isinstance(value, bool):
        return out
    if isinstance(value, (str, int, float)):
        text = str(value).strip()
        if text:
            out.append(text)
        return out
    if isinstance(value, list):
        for item in value:
            collect_strings(item, out)
        return out
    if isinstance(value, dict):
        for nested in value.values():
            collect_strings(nested, out)
    return out


def source_mtime() -> float:
    return catalog_mtime()


def slugify_source_id(name: str) -> str:
    text = re.sub(r"\s+", "-", str(name or "").strip())
    text = re.sub(r"[\\/?#&%=]+", "", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text or "source"


def classify_way(raw: str):
    way = re.sub(r"\s+", " ", str(raw or "").replace("\u00a0", " ")).strip()
    if not way:
        return None
    if way.endswith("购买"):
        name = way[: -len("购买")].strip()
        if name:
            return {"id": slugify_source_id(name), "name": name, "icon": "shop", "rank": 10, "way": way}
    for sid, name, icon, pattern in HOME_STATION_RULES:
        if pattern.search(way):
            return {"id": sid, "name": name, "icon": icon, "rank": 20, "way": way}
    if way.startswith("渔场") or "钓鱼" in way or "加工鱼类" in way:
        return {"id": "fishing", "name": "钓鱼", "icon": "fish", "rank": 30, "way": way}
    if "采集" in way:
        return {"id": "gathering", "name": "区域采集", "icon": "leaf", "rank": 31, "way": way}
    if "探索" in way:
        return {"id": "exploration", "name": "地区探索", "icon": "compass", "rank": 32, "way": way}
    if "牵绊" in way:
        return {"id": "bond", "name": "牵绊奖励", "icon": "heart", "rank": 40, "way": way}
    if "星赐合成" in way:
        return {"id": "star-gift", "name": "星赐合成", "icon": "star", "rank": 41, "way": way}
    if "地区委托" in way:
        return {"id": "region-quest", "name": "地区委托", "icon": "quest", "rank": 42, "way": way}
    if "元素祭坛" in way:
        return {"id": "element-altar", "name": "元素祭坛", "icon": "star", "rank": 43, "way": way}
    if "狩猎场" in way:
        return {"id": "hunting", "name": "狩猎场", "icon": "leaf", "rank": 33, "way": way}
    if "采矿场" in way or "采石场" in way:
        return {"id": "mining", "name": "采矿", "icon": "workshop", "rank": 34, "way": way}
    if "伐木场" in way:
        return {"id": "logging", "name": "伐木", "icon": "leaf", "rank": 35, "way": way}
    if "奇波掉落" in way or "放生奇波" in way:
        return {"id": "qibo-drop", "name": "奇波掉落", "icon": "other", "rank": 44, "way": way}
    if "心得熟练度" in way:
        return {"id": "proficiency", "name": "熟练度奖励", "icon": "quest", "rank": 45, "way": way}
    if "活跃" in way:
        return {"id": "activity", "name": "活跃奖励", "icon": "quest", "rank": 46, "way": way}
    return {"id": "other", "name": "其他获取", "icon": "other", "rank": 55, "way": way}


def classify_item_sources(item: dict) -> list[dict]:
    seen = set()
    out = []
    for way in item.get("ways") or []:
        src = classify_way(way)
        if not src or src["id"] in seen:
            continue
        seen.add(src["id"])
        out.append(src)
    return out


def build_item_source_catalog(items: list[dict]) -> list[dict]:
    catalog = {
        ALL_ITEMS_SOURCE_ID: {
            "id": ALL_ITEMS_SOURCE_ID,
            "name": ALL_ITEMS_SOURCE_NAME,
            "icon": "bag",
            "rank": 0,
            "kind": "all",
            "path": "/encyclopedia/items",
            "ways": [],
            "count": len(items),
        }
    }
    for item in items:
        for src in classify_item_sources(item):
            prev = catalog.get(src["id"])
            if prev:
                prev["count"] += 1
                if src["way"] and src["way"] not in prev["ways"]:
                    prev["ways"].append(src["way"])
                continue
            catalog[src["id"]] = {
                "id": src["id"],
                "name": src["name"],
                "icon": src["icon"],
                "rank": src["rank"],
                "kind": "source",
                "path": f"/encyclopedia/obtain/{src['id']}",
                "ways": [src["way"]] if src.get("way") else [],
                "count": 1,
            }
    return sorted(catalog.values(), key=lambda row: (row["rank"], -row["count"], row["name"]))




def make_doc(**kwargs) -> dict:
    title = kwargs.get("title") or ""
    aliases = kwargs.get("aliases") or ""
    subtitle = kwargs.get("subtitle") or ""
    body = kwargs.get("text") or ""
    return {
        "id": kwargs["id"],
        "kind": kwargs["kind"],
        "title": title,
        "aliases": aliases,
        "subtitle": subtitle,
        "text": body,
        "owner": kwargs.get("owner") or "",
        "labelKey": kwargs.get("label_key") or "",
        "to": kwargs["to"],
        "norm_title": normalize(title),
        "norm_aliases": normalize(aliases),
        "norm_subtitle": normalize(subtitle),
        "norm_text": normalize(body),
    }


def build_documents(characters, qibos, items, sources) -> list[dict]:
    docs = [
        make_doc(
            id="page:home",
            kind="page",
            title="首页",
            label_key="nav.home",
            aliases="Home ホーム 홈 蓝色星原 Azur Promilia アズールプロミリア Wiki",
            subtitle="星宠结伴 · 幻想大世界",
            text="欢迎回到普罗米利亚 角色 奇波 物品 图鉴 攻略",
            to="/",
        )
    ]
    for section in STATIC_NAV:
        section_title, section_aliases = PAGE_LABELS.get(section["label_key"], (section["id"], ""))
        for child in section["children"]:
            title, aliases = PAGE_LABELS.get(child["label_key"], (child["id"], ""))
            docs.append(
                make_doc(
                    id=f"page:{child['path']}",
                    kind="page",
                    title=title,
                    label_key=child["label_key"],
                    aliases=aliases,
                    subtitle=section_title,
                    text=unique_join([title, aliases, section_title, section_aliases, child["path"], child["id"]]),
                    to=child["path"],
                )
            )
    for src in sources:
        if src["id"] == ALL_ITEMS_SOURCE_ID:
            continue
        docs.append(
            make_doc(
                id=f"page:{src['path']}",
                kind="page",
                title=src["name"],
                aliases=unique_join([src["id"], *(src.get("ways") or [])]),
                subtitle="物品获取途径",
                text=unique_join([src["name"], src["id"], *(src.get("ways") or [])]),
                to=src["path"],
            )
        )

    for character in characters:
        skills = character.get("skills") or []
        meta = {key: value for key, value in character.items() if key != "skills"}
        skill_names = [sk.get("name") for sk in skills if isinstance(sk, dict)]
        skill_types = [sk.get("type") for sk in skills if isinstance(sk, dict)]
        docs.append(
            make_doc(
                id=f"character:{character['id']}",
                kind="character",
                title=character.get("name") or character["id"],
                aliases=unique_join([character.get("nameEn"), character["id"]]),
                subtitle=" · ".join([p for p in [character.get("nameEn"), * (character.get("elements") or []), character.get("profession")] if p]),
                text=unique_join([*collect_strings(meta), *skill_names, *skill_types]),
                to={"name": "character-detail", "params": {"id": character["id"]}},
            )
        )
        for index, skill in enumerate(skills):
            if not isinstance(skill, dict) or not skill.get("name"):
                continue
            docs.append(
                make_doc(
                    id=f"skill:{character['id']}:{index}",
                    kind="skill",
                    title=skill["name"],
                    aliases=skill.get("type") or "",
                    subtitle=skill.get("type") or "",
                    owner=character.get("name") or character["id"],
                    text=unique_join(collect_strings({
                        "name": skill.get("name"),
                        "type": skill.get("type"),
                        "desc": skill.get("desc"),
                        "skillSerect": skill.get("skillSerect"),
                    })),
                    to={
                        "name": "character-detail",
                        "params": {"id": character["id"]},
                        "query": {"skill": skill["name"]},
                    },
                )
            )

    for qibo in qibos:
        skills = qibo.get("skills") or []
        meta = {key: value for key, value in qibo.items() if key != "skills"}
        no = qibo.get("no")
        docs.append(
            make_doc(
                id=f"qibo:{qibo['id']}",
                kind="qibo",
                title=qibo.get("name") or qibo["id"],
                aliases=unique_join([qibo["id"], f"NO.{no}" if no is not None else "", str(no or "")]),
                subtitle=" · ".join([p for p in [f"NO.{no}" if no is not None else "", *(qibo.get("elements") or [])] if p]),
                text=unique_join(collect_strings(meta)),
                to={"name": "qibo-detail", "params": {"id": qibo["id"]}},
            )
        )
        for index, skill in enumerate(skills):
            if not isinstance(skill, dict) or not skill.get("name"):
                continue
            docs.append(
                make_doc(
                    id=f"qibo-skill:{qibo['id']}:{index}",
                    kind="skill",
                    title=skill["name"],
                    aliases="",
                    subtitle=qibo.get("name") or qibo["id"],
                    owner=qibo.get("name") or qibo["id"],
                    text=unique_join(collect_strings({
                        "name": skill.get("name"),
                        "desc": skill.get("desc"),
                        "levels": skill.get("levels"),
                    })),
                    to={
                        "name": "qibo-detail",
                        "params": {"id": qibo["id"]},
                        "query": {"skill": skill["name"]},
                    },
                )
            )

    for item in items:
        ways = item.get("ways") or [ALL_ITEMS_SOURCE_NAME]
        rarity = item.get("rarity")
        types = item.get("types") or []
        docs.append(
            make_doc(
                id=f"item:{item['id']}",
                kind="item",
                title=item.get("name") or item["id"],
                aliases=unique_join([item["id"], item.get("wikiSlug"), *types, *(item.get("tags") or [])]),
                subtitle=" · ".join([p for p in [f"{rarity}★" if rarity else "", *types[:2]] if p]),
                text=unique_join([*collect_strings(item), *ways]),
                to={"name": "item-detail", "params": {"id": item["id"]}},
            )
        )
    return docs


def connect() -> sqlite3.Connection:
    conn = getattr(LOCAL, "conn", None)
    if conn is not None:
        return conn
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(SEARCH_DB_PATH, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute("PRAGMA cache_size=-8000")
    LOCAL.conn = conn
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS docs (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            title TEXT NOT NULL,
            aliases TEXT,
            subtitle TEXT,
            body TEXT,
            owner TEXT,
            label_key TEXT,
            route TEXT NOT NULL,
            norm_title TEXT,
            norm_aliases TEXT,
            norm_subtitle TEXT,
            norm_body TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_docs_kind ON docs(kind);
        CREATE TABLE IF NOT EXISTS nav_sources (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT,
            rank INTEGER,
            kind TEXT,
            path TEXT NOT NULL,
            count INTEGER,
            ways TEXT,
            sort INTEGER
        );
        CREATE TABLE IF NOT EXISTS nav_pages (
            id TEXT PRIMARY KEY,
            section_id TEXT NOT NULL,
            label_key TEXT,
            path TEXT NOT NULL,
            icon TEXT,
            sort INTEGER
        );
        CREATE TABLE IF NOT EXISTS entity_summaries (
            kind TEXT NOT NULL,
            id TEXT NOT NULL,
            name TEXT,
            extra TEXT,
            sort INTEGER,
            PRIMARY KEY (kind, id)
        );
        """
    )


def persist_index(docs, sources, characters, qibos, items) -> None:
    conn = connect()
    with WRITE_LOCK:
        init_schema(conn)
        conn.execute("BEGIN IMMEDIATE")
        try:
            conn.execute("DELETE FROM docs")
            conn.execute("DELETE FROM nav_sources")
            conn.execute("DELETE FROM nav_pages")
            conn.execute("DELETE FROM entity_summaries")
            conn.executemany(
                """
                INSERT INTO docs (
                    id, kind, title, aliases, subtitle, body, owner, label_key, route,
                    norm_title, norm_aliases, norm_subtitle, norm_body
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        doc["id"],
                        doc["kind"],
                        doc["title"],
                        doc["aliases"],
                        doc["subtitle"],
                        doc["text"],
                        doc["owner"],
                        doc["labelKey"],
                        json.dumps(doc["to"], ensure_ascii=False),
                        doc["norm_title"],
                        doc["norm_aliases"],
                        doc["norm_subtitle"],
                        doc["norm_text"],
                    )
                    for doc in docs
                ],
            )
            conn.executemany(
                """
                INSERT INTO nav_sources (id, name, icon, rank, kind, path, count, ways, sort)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        src["id"],
                        src["name"],
                        src["icon"],
                        src["rank"],
                        src["kind"],
                        src["path"],
                        src["count"],
                        json.dumps(src.get("ways") or [], ensure_ascii=False),
                        index,
                    )
                    for index, src in enumerate(sources)
                ],
            )
            page_rows = []
            for section in STATIC_NAV:
                for index, child in enumerate(section["children"]):
                    page_rows.append(
                        (child["id"], section["id"], child["label_key"], child["path"], child["icon"], index)
                    )
            conn.executemany(
                """
                INSERT INTO nav_pages (id, section_id, label_key, path, icon, sort)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                page_rows,
            )
            summary_rows = [
                *(
                    ("character", item["id"], item.get("name") or item["id"], json.dumps({"nameEn": item.get("nameEn") or ""}, ensure_ascii=False), index)
                    for index, item in enumerate(characters)
                ),
                *(
                    ("qibo", item["id"], item.get("name") or item["id"], json.dumps({"no": item.get("no")}, ensure_ascii=False), index)
                    for index, item in enumerate(qibos)
                ),
                *(
                    ("item", item["id"], item.get("name") or item["id"], json.dumps({"rarity": item.get("rarity")}, ensure_ascii=False), index)
                    for index, item in enumerate(items[:24])
                ),
            ]
            conn.executemany(
                """
                INSERT INTO entity_summaries (kind, id, name, extra, sort)
                VALUES (?, ?, ?, ?, ?)
                """,
                summary_rows,
            )
            conn.execute(
                "INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)",
                ("stats", json.dumps({"characters": len(characters), "qibos": len(qibos), "items": len(items)}, ensure_ascii=False)),
            )
            conn.execute(
                "INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)",
                ("built_at", str(int(time.time()))),
            )
            conn.execute(
                "INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)",
                ("source_mtime", str(source_mtime())),
            )
            conn.execute("COMMIT")
        except Exception:
            try:
                conn.execute("ROLLBACK")
            except sqlite3.Error:
                pass
            raise


def meta_value(conn: sqlite3.Connection, key: str) -> str:
    row = conn.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
    return row["value"] if row else ""


def load_cache_from_db() -> bool:
    conn = connect()
    init_schema(conn)
    rows = conn.execute(
        """
        SELECT id, kind, title, aliases, subtitle, body, owner, label_key, route,
               norm_title, norm_aliases, norm_subtitle, norm_body
        FROM docs
        """
    ).fetchall()
    if not rows:
        return False
    docs = []
    for row in rows:
        docs.append(
            {
                "id": row["id"],
                "kind": row["kind"],
                "title": row["title"],
                "aliases": row["aliases"] or "",
                "subtitle": row["subtitle"] or "",
                "text": row["body"] or "",
                "owner": row["owner"] or "",
                "labelKey": row["label_key"] or "",
                "to": json.loads(row["route"]),
                "norm_title": row["norm_title"] or "",
                "norm_aliases": row["norm_aliases"] or "",
                "norm_subtitle": row["norm_subtitle"] or "",
                "norm_text": row["norm_body"] or "",
            }
        )
    sources = []
    for row in conn.execute("SELECT * FROM nav_sources ORDER BY sort ASC"):
        sources.append(
            {
                "id": row["id"],
                "name": row["name"],
                "icon": row["icon"],
                "rank": row["rank"],
                "kind": row["kind"],
                "path": row["path"],
                "count": row["count"],
                "ways": json.loads(row["ways"] or "[]"),
            }
        )
    stats_raw = meta_value(conn, "stats")
    stats = json.loads(stats_raw) if stats_raw else {"characters": 0, "qibos": 0, "items": 0}
    characters = []
    qibos = []
    featured_items = []
    for row in conn.execute("SELECT * FROM entity_summaries ORDER BY sort ASC"):
        extra = json.loads(row["extra"] or "{}")
        if row["kind"] == "character":
            characters.append({"id": row["id"], "name": row["name"], "nameEn": extra.get("nameEn") or ""})
        elif row["kind"] == "qibo":
            qibos.append({"id": row["id"], "name": row["name"], "no": extra.get("no")})
        elif row["kind"] == "item":
            featured_items.append(row["name"])
    CACHE["docs"] = docs
    CACHE["nav"] = {
        "stats": stats,
        "itemSources": sources,
        "characters": characters,
        "qibos": qibos,
        "featuredItemNames": featured_items[:3],
        "pages": [dict(row) for row in conn.execute("SELECT * FROM nav_pages ORDER BY section_id, sort")],
    }
    try:
        CACHE["source_mtime"] = float(meta_value(conn, "source_mtime") or -1)
    except ValueError:
        CACHE["source_mtime"] = -1.0
    return True


def rebuild_index() -> dict:
    characters = load_catalog("characters")
    qibos = load_catalog("qibos")
    items = load_catalog("items")
    sources = build_item_source_catalog(items)
    docs = build_documents(characters, qibos, items, sources)
    persist_index(docs, sources, characters, qibos, items)
    CACHE["docs"] = docs
    CACHE["nav"] = {
        "stats": {"characters": len(characters), "qibos": len(qibos), "items": len(items)},
        "itemSources": sources,
        "characters": [{"id": c["id"], "name": c.get("name") or c["id"], "nameEn": c.get("nameEn") or ""} for c in characters],
        "qibos": [{"id": q["id"], "name": q.get("name") or q["id"], "no": q.get("no")} for q in qibos],
        "featuredItemNames": [item.get("name") or item["id"] for item in items[:3]],
        "pages": [
            {"id": child["id"], "section_id": section["id"], "label_key": child["label_key"], "path": child["path"], "icon": child["icon"]}
            for section in STATIC_NAV
            for child in section["children"]
        ],
    }
    CACHE["source_mtime"] = source_mtime()
    CACHE["checked"] = time.time()
    return {"docs": len(docs), **CACHE["nav"]["stats"], "sources": len(sources)}


def ensure_index(force: bool = False) -> dict | None:
    now = time.time()
    if not force and now - CACHE["checked"] < 15 and CACHE["docs"]:
        return None
    CACHE["checked"] = now
    latest = source_mtime()
    if not CACHE["docs"]:
        load_cache_from_db()
    if not force and CACHE["docs"] and latest == CACHE["source_mtime"]:
        return None
    return rebuild_index()


def score_doc(doc: dict, raw: str, nq: str) -> int:
    title_n = doc["norm_title"]
    alias_n = doc["norm_aliases"]
    sub_n = doc["norm_subtitle"]
    text_n = doc["norm_text"]
    if title_n == nq or alias_n == nq:
        return 400
    if title_n.startswith(nq) or alias_n.startswith(nq):
        return 320
    if nq in title_n or nq in alias_n:
        return 260
    if nq in sub_n:
        return 180
    if nq in text_n:
        return 120
    raw_l = raw.lower()
    if raw_l and raw_l in (doc["title"] or "").lower():
        return 260
    return 0


def make_snippet(doc: dict, query: str) -> str:
    q = query.strip()
    nq = normalize(q)
    if not q:
        return doc["subtitle"]
    if nq and (nq in doc["norm_title"] or nq in doc["norm_aliases"]):
        return ""
    hay = doc["text"] or ""
    idx = hay.lower().find(q.lower())
    if idx < 0:
        return doc["subtitle"]
    start = max(0, idx - 18)
    end = min(len(hay), idx + len(q) + 36)
    snippet = " ".join(hay[start:end].split())
    if start > 0:
        snippet = f"…{snippet}"
    if end < len(hay):
        snippet = f"{snippet}…"
    return snippet


def search_docs(query: str, limit: int = 12) -> list[dict]:
    ensure_index()
    raw = str(query or "").strip()
    nq = normalize(raw)
    if not nq:
        return []
    limit = max(1, min(int(limit or 12), 30))
    scored = []
    for doc in CACHE["docs"]:
        score = score_doc(doc, raw, nq)
        if score:
            scored.append((score, doc["title"], doc))
    scored.sort(key=lambda row: (-row[0], row[1]))
    results = []
    for score, _title, doc in scored[:limit]:
        results.append(
            {
                "id": doc["id"],
                "kind": doc["kind"],
                "title": doc["title"],
                "aliases": doc["aliases"],
                "subtitle": doc["subtitle"],
                "owner": doc["owner"],
                "labelKey": doc["labelKey"],
                "to": doc["to"],
                "score": score,
                "snippet": make_snippet(doc, raw),
            }
        )
    return results


def nav_payload() -> dict:
    ensure_index()
    nav = CACHE.get("nav") or {}
    return {
        "ok": True,
        "stats": nav.get("stats") or {"characters": 0, "qibos": 0, "items": 0},
        "itemSources": nav.get("itemSources") or [],
        "characters": nav.get("characters") or [],
        "qibos": nav.get("qibos") or [],
        "featuredItemNames": nav.get("featuredItemNames") or [],
        "pages": nav.get("pages") or [],
    }


def health_payload() -> dict:
    ensure_index()
    stats = (CACHE.get("nav") or {}).get("stats") or {}
    return {
        "docs": len(CACHE.get("docs") or []),
        "db": str(SEARCH_DB_PATH),
        **stats,
    }
