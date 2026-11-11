# -*- coding: utf-8 -*-
from __future__ import annotations

import bpy
from bpy.app.handlers import persistent

from . import preview
from . import weights

_last_hashes: dict[str, tuple] = {}
_updating = False
_last_active_name: str | None = None


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
    global _updating, _last_active_name
    if _updating:
        return
    props = getattr(scene, "sbweight", None)
    if props is None:
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

    for name in list(_last_hashes.keys()):
        if name not in current_names:
            del _last_hashes[name]

    active = bpy.context.view_layer.objects.active
    active_name = active.name if active else None
    active_changed = active_name != _last_active_name
    _last_active_name = active_name

    _updating = True
    try:
        if props.live_update and dirty:
            weights.refresh_proxies(dirty, normalize=props.auto_normalize)
        elif props.weight_preview and (active_changed or dirty):
            if weights.is_proxy(active):
                preview.update_preview_for_proxy(active, scene)
    finally:
        _updating = False


def register():
    if sbweight_depsgraph_handler not in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.append(sbweight_depsgraph_handler)


def unregister():
    if sbweight_depsgraph_handler in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.remove(sbweight_depsgraph_handler)
    _last_hashes.clear()
    global _last_active_name
    _last_active_name = None
