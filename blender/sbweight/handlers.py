# -*- coding: utf-8 -*-
from __future__ import annotations

import bpy
from bpy.app.handlers import persistent

from . import preview
from . import weights

_last_hashes: dict[str, tuple] = {}
_updating = False
_last_active_name: str | None = None

# Deferred refresh state (transform / prop edits settle, then compute once).
_pending_proxy_names: set[str] = set()
_pending_force_names: set[str] = set()  # always recompute (slider / shape edits)
_pending_preview_only: bool = False
_timer_registered = False
_DEBOUNCE_S = 0.05

_TRANSFORM_MODAL_PREFIXES = (
    "TRANSFORM_OT_",
    "VIEW3D_OT_move",
    "VIEW3D_OT_rotate",
    "VIEW3D_OT_zoom",
    "OBJECT_OT_transform",
)


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


def _is_modal_transforming() -> bool:
    """True while an interactive transform modal operator is running."""
    wm = bpy.context.window_manager
    if wm is None:
        return False
    for window in wm.windows:
        try:
            ops = window.modal_operators
        except Exception:
            continue
        for op in ops:
            name = getattr(op, "bl_idname", "") or ""
            if any(name.startswith(p) for p in _TRANSFORM_MODAL_PREFIXES):
                return True
            # Fallback: common transform idnames without OT_ prefix quirks
            if "transform.translate" in name or "transform.resize" in name:
                return True
            if "transform.rotate" in name:
                return True
    return False


def _flush_pending():
    """Run one deferred weight (and/or preview) refresh on the main thread."""
    global _updating, _pending_preview_only

    scene = bpy.context.scene
    props = getattr(scene, "sbweight", None)
    if props is None:
        _pending_proxy_names.clear()
        _pending_force_names.clear()
        _pending_preview_only = False
        return

    force_names = set(_pending_force_names)
    _pending_force_names.clear()
    all_names = set(_pending_proxy_names) | force_names
    _pending_proxy_names.clear()
    preview_only = _pending_preview_only
    _pending_preview_only = False

    proxies = []
    for name in all_names:
        obj = bpy.data.objects.get(name)
        if weights.is_proxy(obj):
            proxies.append(obj)

    if not proxies and not preview_only:
        return

    # Force (RNA slider/shape) always recomputes; transform queue respects live_update.
    do_weights = bool(force_names) or (props.live_update and bool(proxies))

    _updating = True
    try:
        if do_weights and proxies:
            weights.refresh_proxies(proxies, normalize=props.auto_normalize)
        elif props.weight_preview:
            active = bpy.context.view_layer.objects.active
            if weights.is_proxy(active):
                preview.update_preview_for_proxy(active, scene)
            elif proxies:
                preview.update_preview_for_proxy(proxies[-1], scene)
    finally:
        _updating = False


def _timer_callback():
    """Keep waiting while the user is still dragging; flush when idle."""
    global _timer_registered

    if _updating:
        return _DEBOUNCE_S

    if _is_modal_transforming():
        # Still resizing / moving — do not compute weights yet.
        return _DEBOUNCE_S

    if not _pending_proxy_names and not _pending_force_names and not _pending_preview_only:
        _timer_registered = False
        return None

    _flush_pending()
    _timer_registered = False
    return None


def _ensure_timer(*, reset: bool = False):
    """Register (or restart) the debounce timer so continuous edits coalesce."""
    global _timer_registered
    if _timer_registered and reset:
        try:
            bpy.app.timers.unregister(_timer_callback)
        except Exception:
            pass
        _timer_registered = False
    if _timer_registered:
        return
    try:
        bpy.app.timers.register(_timer_callback, first_interval=_DEBOUNCE_S)
        _timer_registered = True
    except Exception:
        # Timers unavailable (e.g. background); flush immediately.
        _flush_pending()


def schedule_proxy_refresh(
    proxies,
    *,
    preview_only: bool = False,
    force: bool = False,
) -> None:
    """Queue proxies for a single deferred refresh after interaction settles.

    force=True: recompute even when scene.live_update is off (weight sliders).
    """
    global _pending_preview_only
    if not proxies and not preview_only:
        return
    for p in proxies:
        if p is None:
            continue
        _pending_proxy_names.add(p.name)
        if force:
            _pending_force_names.add(p.name)
    if preview_only:
        _pending_preview_only = True
    # Restart debounce window on every dirty event so drag coalesces to one flush.
    _ensure_timer(reset=True)


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

    if dirty:
        if props.live_update:
            schedule_proxy_refresh(dirty)
        elif props.weight_preview:
            schedule_proxy_refresh(dirty, preview_only=True)
    elif props.weight_preview and active_changed and weights.is_proxy(active):
        schedule_proxy_refresh([active], preview_only=True)


def register():
    if sbweight_depsgraph_handler not in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.append(sbweight_depsgraph_handler)


def unregister():
    global _timer_registered, _pending_preview_only, _last_active_name
    if sbweight_depsgraph_handler in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.remove(sbweight_depsgraph_handler)
    if _timer_registered:
        try:
            bpy.app.timers.unregister(_timer_callback)
        except Exception:
            pass
        _timer_registered = False
    _pending_proxy_names.clear()
    _pending_force_names.clear()
    _pending_preview_only = False
    _last_hashes.clear()
    _last_active_name = None
