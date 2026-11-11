# -*- coding: utf-8 -*-
"""Realtime weight preview via vertex colors in Object mode."""

from __future__ import annotations

import bpy

from . import weights

PREVIEW_ATTR = "SBW_WeightPreview"

_saved_shading: dict[str, tuple] | None = None
_last_preview_key: tuple[str, str] | None = None


def weight_to_color(w: float) -> tuple[float, float, float, float]:
    """Approximate Blender weight-paint rainbow (blue → red)."""
    w = 0.0 if w < 0.0 else (1.0 if w > 1.0 else w)
    if w < 0.25:
        t = w / 0.25
        return (0.0, t, 1.0, 1.0)
    if w < 0.5:
        t = (w - 0.25) / 0.25
        return (0.0, 1.0, 1.0 - t, 1.0)
    if w < 0.75:
        t = (w - 0.5) / 0.25
        return (t, 1.0, 0.0, 1.0)
    t = (w - 0.75) / 0.25
    return (1.0, 1.0 - t, 0.0, 1.0)


def _ensure_preview_attribute(mesh_data):
    attr = mesh_data.color_attributes.get(PREVIEW_ATTR)
    if attr is None:
        attr = mesh_data.color_attributes.new(
            name=PREVIEW_ATTR,
            type="FLOAT_COLOR",
            domain="POINT",
        )
    elif attr.domain != "POINT" or attr.data_type not in {"FLOAT_COLOR", "BYTE_COLOR"}:
        mesh_data.color_attributes.remove(attr)
        attr = mesh_data.color_attributes.new(
            name=PREVIEW_ATTR,
            type="FLOAT_COLOR",
            domain="POINT",
        )
    mesh_data.color_attributes.active_color = attr
    return attr


def _vertex_group_weights(mesh_obj, bone_name: str) -> list[float]:
    n = len(mesh_obj.data.vertices)
    out = [0.0] * n
    vg = mesh_obj.vertex_groups.get(bone_name)
    if vg is None:
        return out
    gi = vg.index
    for v in mesh_obj.data.vertices:
        for g in v.groups:
            if g.group == gi:
                out[v.index] = g.weight
                break
    return out


def write_weight_colors(mesh_obj, bone_name: str) -> None:
    if mesh_obj is None or mesh_obj.type != "MESH" or not bone_name:
        return
    attr = _ensure_preview_attribute(mesh_obj.data)
    values = _vertex_group_weights(mesh_obj, bone_name)
    data = attr.data
    for i, w in enumerate(values):
        data[i].color = weight_to_color(w)
    # Keep Weight Paint mode aligned with the same group when user switches later.
    vg = mesh_obj.vertex_groups.get(bone_name)
    if vg is not None:
        mesh_obj.vertex_groups.active_index = vg.index


def ensure_viewport_preview(force: bool = False) -> None:
    """Switch visible 3D views to Solid + Vertex color for clear heatmaps."""
    global _saved_shading
    if _saved_shading is None:
        _saved_shading = {}

    for window in bpy.context.window_manager.windows:
        screen = window.screen
        if screen is None:
            continue
        for area in screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            if space is None or space.type != "VIEW_3D":
                continue
            key = f"{window.as_pointer()}:{area.as_pointer()}"
            sh = space.shading
            if key not in _saved_shading:
                _saved_shading[key] = (sh.type, sh.color_type, getattr(sh, "light", "STUDIO"))
            if force or sh.color_type != "VERTEX" or sh.type != "SOLID":
                sh.type = "SOLID"
                try:
                    sh.light = "FLAT"
                except Exception:
                    pass
                sh.color_type = "VERTEX"


def restore_viewport_shading() -> None:
    global _saved_shading
    if not _saved_shading:
        _saved_shading = None
        return
    for window in bpy.context.window_manager.windows:
        screen = window.screen
        if screen is None:
            continue
        for area in screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            if space is None or space.type != "VIEW_3D":
                continue
            key = f"{window.as_pointer()}:{area.as_pointer()}"
            saved = _saved_shading.get(key)
            if not saved:
                continue
            sh = space.shading
            sh.type, sh.color_type, light = saved
            try:
                sh.light = light
            except Exception:
                pass
    _saved_shading = None


def clear_preview_colors(mesh_obj) -> None:
    if mesh_obj is None or mesh_obj.type != "MESH":
        return
    attr = mesh_obj.data.color_attributes.get(PREVIEW_ATTR)
    if attr is None:
        return
    zero = (0.2, 0.2, 0.2, 1.0)
    for item in attr.data:
        item.color = zero


def preview_enabled(scene=None) -> bool:
    scene = scene or bpy.context.scene
    props = getattr(scene, "sbweight", None)
    return bool(props and props.weight_preview)


def update_preview_for_proxy(proxy, scene=None) -> None:
    global _last_preview_key
    if not weights.is_proxy(proxy):
        return
    if not preview_enabled(scene):
        return
    arm = bpy.data.objects.get(proxy.sbweight.armature_name)
    if arm is None or arm.type != "ARMATURE":
        return
    bone_name = proxy.sbweight.bone_name
    for mesh_obj in weights.find_deformed_meshes(arm):
        write_weight_colors(mesh_obj, bone_name)
    ensure_viewport_preview()
    _last_preview_key = (proxy.sbweight.armature_name, bone_name)


def update_preview_for_bone(armature_name: str, bone_name: str, scene=None) -> None:
    global _last_preview_key
    if not preview_enabled(scene):
        return
    arm = bpy.data.objects.get(armature_name)
    if arm is None or arm.type != "ARMATURE":
        return
    for mesh_obj in weights.find_deformed_meshes(arm):
        write_weight_colors(mesh_obj, bone_name)
    ensure_viewport_preview()
    _last_preview_key = (armature_name, bone_name)


def update_preview_from_active(scene=None) -> None:
    scene = scene or bpy.context.scene
    if not preview_enabled(scene):
        return
    obj = bpy.context.view_layer.objects.active
    if weights.is_proxy(obj):
        key = (obj.sbweight.armature_name, obj.sbweight.bone_name)
        if key != _last_preview_key:
            update_preview_for_proxy(obj, scene)
        else:
            # Same bone: still refresh colors after weight edits.
            update_preview_for_proxy(obj, scene)


def on_preview_toggle(scene, enabled: bool) -> None:
    global _last_preview_key
    if enabled:
        obj = bpy.context.view_layer.objects.active
        if weights.is_proxy(obj):
            update_preview_for_proxy(obj, scene)
        else:
            proxies = weights.list_proxies(scene)
            if proxies:
                update_preview_for_proxy(proxies[-1], scene)
            else:
                ensure_viewport_preview(force=True)
    else:
        for obj in scene.objects:
            if obj.type == "MESH":
                clear_preview_colors(obj)
        restore_viewport_shading()
        _last_preview_key = None
