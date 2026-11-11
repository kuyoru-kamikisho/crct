# -*- coding: utf-8 -*-
from __future__ import annotations

from mathutils import Vector

import bpy


PROXY_PREFIX = "SBW_"


def is_proxy(obj) -> bool:
    return bool(obj and obj.type == "EMPTY" and getattr(obj, "sbweight", None) and obj.sbweight.is_proxy)


def list_proxies(scene=None):
    scene = scene or bpy.context.scene
    return [obj for obj in scene.objects if is_proxy(obj)]


def find_deformed_meshes(armature) -> list:
    meshes = []
    if armature is None:
        return meshes
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        for mod in obj.modifiers:
            if mod.type == "ARMATURE" and mod.object == armature:
                meshes.append(obj)
                break
        else:
            if obj.parent == armature:
                meshes.append(obj)
    return meshes


def ensure_vertex_group(mesh_obj, bone_name: str):
    vg = mesh_obj.vertex_groups.get(bone_name)
    if vg is None:
        vg = mesh_obj.vertex_groups.new(name=bone_name)
    return vg


def _corner_weights(props) -> list[float]:
    # Order matches local corners:
    # 1 LUB (-x,-y,+z), 2 RUB (+x,-y,+z), 3 LUF (-x,+y,+z), 4 RUF (+x,+y,+z),
    # 5 LDB (-x,-y,-z), 6 RDB (+x,-y,-z), 7 LDF (-x,+y,-z), 8 RDF (+x,+y,-z)
    return [
        props.weight_v1,
        props.weight_v2,
        props.weight_v3,
        props.weight_v4,
        props.weight_v5,
        props.weight_v6,
        props.weight_v7,
        props.weight_v8,
    ]


def _trilinear_corners(nx: float, ny: float, nz: float, corners: list[float]) -> float:
    """nx,ny,nz in [0,1] from -axis to +axis."""
    c000 = corners[4]  # LDB
    c100 = corners[5]  # RDB
    c010 = corners[6]  # LDF
    c110 = corners[7]  # RDF
    c001 = corners[0]  # LUB
    c101 = corners[1]  # RUB
    c011 = corners[2]  # LUF
    c111 = corners[3]  # RUF

    c00 = c000 * (1.0 - nx) + c100 * nx
    c01 = c001 * (1.0 - nx) + c101 * nx
    c10 = c010 * (1.0 - nx) + c110 * nx
    c11 = c011 * (1.0 - nx) + c111 * nx
    c0 = c00 * (1.0 - ny) + c10 * ny
    c1 = c01 * (1.0 - ny) + c11 * ny
    return c0 * (1.0 - nz) + c1 * nz


def weight_at_local(proxy, local: Vector) -> float:
    props = proxy.sbweight
    size = max(proxy.empty_display_size, 1e-8)
    nx = local.x / size
    ny = local.y / size
    nz = local.z / size

    if props.shape == "SPHERE":
        r = Vector((nx, ny, nz)).length
        if r > 1.0 + 1e-6:
            return 0.0
        r = min(max(r, 0.0), 1.0)
        w = props.weight_center * (1.0 - r) + props.weight_boundary * r
    else:
        # Cube: Chebyshev radius; outside if any axis > 1
        ax, ay, az = abs(nx), abs(ny), abs(nz)
        if ax > 1.0 + 1e-6 or ay > 1.0 + 1e-6 or az > 1.0 + 1e-6:
            return 0.0
        r = max(ax, ay, az)
        # Map [-1,1] -> [0,1] for corner blend
        u = (nx + 1.0) * 0.5
        v = (ny + 1.0) * 0.5
        ww = (nz + 1.0) * 0.5
        boundary = _trilinear_corners(u, v, ww, _corner_weights(props))
        w = props.weight_center * (1.0 - r) + boundary * r

    w = w + props.weight_offset
    if w < 0.0:
        return 0.0
    if w > 1.0:
        return 1.0
    return w


def _proxy_world_inv(proxy):
    return proxy.matrix_world.inverted()


def compute_proxy_weights(proxy, mesh_obj) -> dict[int, float]:
    """Return {vertex_index: weight} for vertices inside the proxy."""
    result = {}
    inv = _proxy_world_inv(proxy)
    mesh = mesh_obj.data
    mat = mesh_obj.matrix_world
    for i, vert in enumerate(mesh.vertices):
        local = inv @ (mat @ vert.co)
        w = weight_at_local(proxy, local)
        if w > 0.0:
            result[i] = w
    return result


def proxies_for_bone(armature_name: str, bone_name: str, scene=None) -> list:
    out = []
    for p in list_proxies(scene):
        if p.sbweight.armature_name == armature_name and p.sbweight.bone_name == bone_name:
            out.append(p)
    return out


def _group_member_indices(mesh_obj, bone_name: str) -> set[int]:
    vg = mesh_obj.vertex_groups.get(bone_name)
    if vg is None:
        return set()
    indices = set()
    gi = vg.index
    for vert in mesh_obj.data.vertices:
        for g in vert.groups:
            if g.group == gi:
                indices.add(vert.index)
                break
    return indices


def _assign_group_weights(mesh_obj, bone_name: str, index_weights: dict[int, float]) -> set[int]:
    """Assign weights; return previous member indices union new ones."""
    previous = _group_member_indices(mesh_obj, bone_name)
    vg = ensure_vertex_group(mesh_obj, bone_name)
    try:
        vg.remove([v.index for v in mesh_obj.data.vertices])
    except RuntimeError:
        pass
    for idx, w in index_weights.items():
        if w <= 0.0:
            continue
        vg.add([idx], w, "REPLACE")
    return previous | set(index_weights.keys())


def normalize_mesh_weights(mesh_obj, affected_indices: set[int] | None = None):
    """Scale weights down when a vertex total exceeds 1.

    Only shrinks overflows from multi-bone overlap so single-proxy falloff
    (e.g. boundary 0.2) is preserved.
    """
    mesh = mesh_obj.data
    groups = mesh_obj.vertex_groups
    if not groups:
        return
    for vert in mesh.vertices:
        if affected_indices is not None and vert.index not in affected_indices:
            continue
        total = 0.0
        membership = []
        for g in vert.groups:
            total += g.weight
            membership.append((g.group, g.weight))
        if not membership or total <= 1.0 + 1e-6:
            continue
        for group_index, weight in membership:
            groups[group_index].add([vert.index], weight / total, "REPLACE")


def refresh_bone_on_meshes(armature, bone_name: str, meshes=None, normalize=True):
    if armature is None or not bone_name:
        return
    meshes = meshes if meshes is not None else find_deformed_meshes(armature)
    proxies = proxies_for_bone(armature.name, bone_name)
    for mesh_obj in meshes:
        merged: dict[int, float] = {}
        for proxy in proxies:
            for idx, w in compute_proxy_weights(proxy, mesh_obj).items():
                prev = merged.get(idx, 0.0)
                if w > prev:
                    merged[idx] = w
        affected = _assign_group_weights(mesh_obj, bone_name, merged)
        if normalize:
            normalize_mesh_weights(mesh_obj, affected)


def refresh_proxies(proxies, normalize=True):
    """Refresh all bones referenced by the given proxies."""
    jobs = {}
    for proxy in proxies:
        if not is_proxy(proxy):
            continue
        key = (proxy.sbweight.armature_name, proxy.sbweight.bone_name)
        jobs[key] = True

    for armature_name, bone_name in jobs:
        armature = bpy.data.objects.get(armature_name)
        if armature is None or armature.type != "ARMATURE":
            continue
        refresh_bone_on_meshes(armature, bone_name, normalize=normalize)


def refresh_all(scene=None, normalize=True):
    scene = scene or bpy.context.scene
    jobs = {}
    for proxy in list_proxies(scene):
        jobs[(proxy.sbweight.armature_name, proxy.sbweight.bone_name)] = True
    for armature_name, bone_name in jobs:
        armature = bpy.data.objects.get(armature_name)
        if armature is None or armature.type != "ARMATURE":
            continue
        refresh_bone_on_meshes(armature, bone_name, normalize=normalize)


def apply_offset_bake(proxy):
    """Bake current weight_offset into distribution by refreshing, then reset offset to 0.

    Offset is already included in weight_at_local during refresh; baking means
    the user wants the offset to stick as the new baseline visually while
    resetting the spinner. We fold offset into center/corners/boundary then zero it.
    """
    if not is_proxy(proxy):
        return False
    props = proxy.sbweight
    off = props.weight_offset
    if abs(off) < 1e-8:
        # still refresh once
        refresh_proxies([proxy], normalize=True)
        return True

    def clamp01(v):
        return max(0.0, min(1.0, v))

    props.weight_center = clamp01(props.weight_center + off)
    props.weight_boundary = clamp01(props.weight_boundary + off)
    props.weight_v1 = clamp01(props.weight_v1 + off)
    props.weight_v2 = clamp01(props.weight_v2 + off)
    props.weight_v3 = clamp01(props.weight_v3 + off)
    props.weight_v4 = clamp01(props.weight_v4 + off)
    props.weight_v5 = clamp01(props.weight_v5 + off)
    props.weight_v6 = clamp01(props.weight_v6 + off)
    props.weight_v7 = clamp01(props.weight_v7 + off)
    props.weight_v8 = clamp01(props.weight_v8 + off)
    props.weight_offset = 0.0
    refresh_proxies([proxy], normalize=bpy.context.scene.sbweight.auto_normalize)
    return True
