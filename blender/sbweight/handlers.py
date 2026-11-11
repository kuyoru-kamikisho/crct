# -*- coding: utf-8 -*-
from __future__ import annotations

import bpy
from bpy.app.handlers import persistent

from . import weights

_last_hashes: dict[str, tuple] = {}
_updating = False


def _proxy_hash(obj) -> tuple:
    mw = obj.matrix_world
    return (
        obj.name,
        obj.empty_display_size,
        obj.empty_display_type,
        tuple(round(v, 5) for v in mw[0]),
        tuple(round(v, 5) for v in mw[1]),
        tuple(round(v, 5) for v in mw[2]),
        tuple(round(v, 5) for v in mw[3]),
        obj.sbweight.shape,
        round(obj.sbweight.weight_center, 5),
        round(obj.sbweight.weight_boundary, 5),
        round(obj.sbweight.weight_offset, 5),
        round(obj.sbweight.weight_v1, 5),
        round(obj.sbweight.weight_v2, 5),
        round(obj.sbweight.weight_v3, 5),
        round(obj.sbweight.weight_v4, 5),
        round(obj.sbweight.weight_v5, 5),
        round(obj.sbweight.weight_v6, 5),
        round(obj.sbweight.weight_v7, 5),
        round(obj.sbweight.weight_v8, 5),
    )


@persistent
def sbweight_depsgraph_handler(scene, depsgraph):
    global _updating
    if _updating:
        return
    if not getattr(scene, "sbweight", None) or not scene.sbweight.live_update:
        return

    dirty = []
    current_names = set()
    for obj in weights.list_proxies(scene):
        current_names.add(obj.name)
        h = _proxy_hash(obj)
        prev = _last_hashes.get(obj.name)
        if prev != h:
            dirty.append(obj)
            _last_hashes[obj.name] = h

    # Drop removed proxies from cache
    for name in list(_last_hashes.keys()):
        if name not in current_names:
            del _last_hashes[name]

    if not dirty:
        return

    _updating = True
    try:
        weights.refresh_proxies(dirty, normalize=scene.sbweight.auto_normalize)
    finally:
        _updating = False


def register():
    if sbweight_depsgraph_handler not in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.append(sbweight_depsgraph_handler)


def unregister():
    if sbweight_depsgraph_handler in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.remove(sbweight_depsgraph_handler)
    _last_hashes.clear()
