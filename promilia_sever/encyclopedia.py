#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""图鉴列表 / 详情接口拼装。列表返回全量数组，详情只返回单个对象。"""

from __future__ import annotations

from catalog import get_by_id, list_all, neighbors
from wiki_index import ALL_ITEMS_SOURCE_ID, classify_item_sources


def fail(code: str, message: str) -> dict:
    return {"ok": False, "code": code, "message": message}


def characters_payload() -> dict:
    return {"ok": True, "characters": list_all("characters")}


def character_payload(entity_id: str) -> dict:
    item = get_by_id("characters", entity_id)
    if not item:
        return fail("NOT_FOUND", "character not found")
    return {"ok": True, "character": item}


def qibos_payload() -> dict:
    return {"ok": True, "qibos": list_all("qibos")}


def hydrate_qibo(qibo: dict) -> dict:
    all_qibos = list_all("qibos")
    evolutions = qibo.get("evolutions") or []
    hydrated = []
    for evo in evolutions:
        if not isinstance(evo, dict):
            continue
        matched = next((row for row in all_qibos if row.get("wikiSlug") and row.get("wikiSlug") == evo.get("wikiSlug")), None)
        if matched is None:
            matched = next(
                (
                    row
                    for row in all_qibos
                    if row.get("name") == evo.get("name") and str(row.get("no")) == str(evo.get("no"))
                ),
                None,
            )
        if matched is None:
            matched = next((row for row in all_qibos if row.get("name") == evo.get("name")), None)
        row = dict(evo)
        if matched:
            row["id"] = matched["id"]
            row["image"] = matched.get("image")
            row["current"] = matched["id"] == qibo.get("id")
        else:
            row["current"] = evo.get("name") == qibo.get("name")
        hydrated.append(row)
    out = dict(qibo)
    out["evolutions"] = hydrated
    return out


def qibo_payload(entity_id: str) -> dict:
    item = get_by_id("qibos", entity_id)
    if not item:
        return fail("NOT_FOUND", "qibo not found")
    prev, nxt = neighbors("qibos", item["id"])
    return {"ok": True, "qibo": hydrate_qibo(item), "prev": prev, "next": nxt}


def items_payload() -> dict:
    return {"ok": True, "items": list_all("items")}


def items_for_source(source_id: str | None) -> list[dict]:
    items = list_all("items")
    if not source_id or source_id == ALL_ITEMS_SOURCE_ID:
        return items
    return [item for item in items if any(src.get("id") == source_id for src in classify_item_sources(item))]


def item_payload(entity_id: str, source_id: str | None = None) -> dict:
    item = get_by_id("items", entity_id)
    if not item:
        return fail("NOT_FOUND", "item not found")
    scoped = items_for_source(source_id)
    prev, nxt = neighbors("items", item["id"], scoped)
    if prev is None and nxt is None and source_id and source_id != ALL_ITEMS_SOURCE_ID:
        prev, nxt = neighbors("items", item["id"])
    return {"ok": True, "item": item, "prev": prev, "next": nxt, "from": source_id or ALL_ITEMS_SOURCE_ID}
