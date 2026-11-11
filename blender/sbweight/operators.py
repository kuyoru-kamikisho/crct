# -*- coding: utf-8 -*-
from __future__ import annotations

import bpy
from bpy.types import Operator
from mathutils import Matrix

from . import i18n
from . import weights


def _pose_bone_selected(pose_bone) -> bool:
    """Blender 5.x stores selection on PoseBone; older versions use Bone.select."""
    if hasattr(pose_bone, "select"):
        try:
            return bool(pose_bone.select)
        except Exception:
            pass
    bone = pose_bone.bone
    return bool(getattr(bone, "select", False))


def _active_armature_from_weight_paint(context):
    """In weight paint, active is often the mesh; armature may be selected too."""
    obj = context.active_object
    if obj and obj.type == "ARMATURE":
        return obj
    if obj and obj.type == "MESH":
        for mod in obj.modifiers:
            if mod.type == "ARMATURE" and mod.object:
                return mod.object
        if obj.parent and obj.parent.type == "ARMATURE":
            return obj.parent
    for o in context.selected_objects:
        if o.type == "ARMATURE":
            return o
    return None


def _gather_bones(context):
    arm = _active_armature_from_weight_paint(context)
    if arm is None:
        return None, []
    bones = [b for b in arm.pose.bones if _pose_bone_selected(b)]
    return arm, bones


def _create_proxy_for_bone(armature, pose_bone, shape: str):
    name = f"{weights.PROXY_PREFIX}{armature.name}_{pose_bone.name}"
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "SPHERE" if shape == "SPHERE" else "CUBE"
    length = max(pose_bone.length, 0.05)
    # Half-extent covers the bone length; user can scale for mesh thickness.
    empty.empty_display_size = length * 0.55

    coll = armature.users_collection[0] if armature.users_collection else bpy.context.scene.collection
    coll.objects.link(empty)

    empty.parent = armature
    empty.parent_type = "BONE"
    empty.parent_bone = pose_bone.name
    # Bone parenting attaches at the tip; move to bone mid-point along -Y.
    empty.matrix_basis = Matrix.Translation((0.0, -pose_bone.length * 0.5, 0.0))

    props = empty.sbweight
    # Set identity fields first; mark is_proxy last so update callbacks stay quiet.
    props.armature_name = armature.name
    props.bone_name = pose_bone.name
    props.weight_center = 1.0
    props.weight_boundary = 0.2
    for attr in (
        "weight_v1",
        "weight_v2",
        "weight_v3",
        "weight_v4",
        "weight_v5",
        "weight_v6",
        "weight_v7",
        "weight_v8",
    ):
        setattr(props, attr, 0.8)
    props.weight_offset = 0.0
    props.shape = shape
    empty.empty_display_type = "SPHERE" if shape == "SPHERE" else "CUBE"
    props.is_proxy = True
    empty.show_name = True
    empty.show_in_front = True
    return empty


class SBWEIGHT_OT_create_bbox(Operator):
    bl_idname = "sbweight.create_bbox"
    bl_label = "Create Bounding Boxes"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        # Only in pose / weight paint, and only when at least one bone is selected.
        if context.mode not in {"POSE", "PAINT_WEIGHT"}:
            return False
        arm, bones = _gather_bones(context)
        return arm is not None and bool(bones)

    def execute(self, context):
        arm, bones = _gather_bones(context)
        if arm is None or not bones:
            self.report({"ERROR"}, i18n.t("no_bone"))
            return {"CANCELLED"}
        shape = context.scene.sbweight.shape
        created = []
        for bone in bones:
            created.append(_create_proxy_for_bone(arm, bone, shape))
        weights.refresh_proxies(created, normalize=context.scene.sbweight.auto_normalize)
        for obj in context.view_layer.objects:
            obj.select_set(False)
        for e in created:
            e.select_set(True)
        if created:
            context.view_layer.objects.active = created[-1]
        self.report({"INFO"}, i18n.t("created", count=len(created)))
        return {"FINISHED"}


class SBWEIGHT_OT_refresh(Operator):
    bl_idname = "sbweight.refresh"
    bl_label = "Refresh Weights"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        proxies = [o for o in context.selected_objects if weights.is_proxy(o)]
        if not proxies:
            active = context.active_object
            if weights.is_proxy(active):
                proxies = [active]
        if not proxies:
            self.report({"ERROR"}, i18n.t("no_proxy"))
            return {"CANCELLED"}
        weights.refresh_proxies(proxies, normalize=context.scene.sbweight.auto_normalize)
        self.report({"INFO"}, i18n.t("refreshed"))
        return {"FINISHED"}


class SBWEIGHT_OT_apply_offset(Operator):
    bl_idname = "sbweight.apply_offset"
    bl_label = "Apply Weight Offset"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        obj = context.active_object
        if not weights.is_proxy(obj):
            self.report({"ERROR"}, i18n.t("not_proxy"))
            return {"CANCELLED"}
        weights.apply_offset_bake(obj)
        self.report({"INFO"}, i18n.t("offset_applied"))
        return {"FINISHED"}


class SBWEIGHT_OT_remove_selected_bone_bbox(Operator):
    bl_idname = "sbweight.remove_selected_bone_bbox"
    bl_label = "Remove Selected Bone Boxes"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        if context.mode not in {"POSE", "PAINT_WEIGHT"}:
            return False
        arm, bones = _gather_bones(context)
        return arm is not None and bool(bones)

    def execute(self, context):
        arm, bones = _gather_bones(context)
        if arm is None or not bones:
            self.report({"ERROR"}, i18n.t("no_bone"))
            return {"CANCELLED"}
        bone_names = {b.name for b in bones}
        to_remove = [
            p
            for p in weights.list_proxies(context.scene)
            if p.sbweight.armature_name == arm.name and p.sbweight.bone_name in bone_names
        ]
        count = len(to_remove)
        for p in to_remove:
            bpy.data.objects.remove(p, do_unlink=True)
        self.report({"INFO"}, i18n.t("removed", count=count))
        return {"FINISHED"}


class SBWEIGHT_OT_remove_armature_bbox(Operator):
    bl_idname = "sbweight.remove_armature_bbox"
    bl_label = "Remove Armature Boxes"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        if context.mode not in {"POSE", "PAINT_WEIGHT"}:
            return False
        return _active_armature_from_weight_paint(context) is not None

    def execute(self, context):
        arm = _active_armature_from_weight_paint(context)
        if arm is None:
            obj = context.active_object
            if weights.is_proxy(obj):
                arm = bpy.data.objects.get(obj.sbweight.armature_name)
        if arm is None:
            self.report({"ERROR"}, i18n.t("no_bone"))
            return {"CANCELLED"}
        to_remove = [
            p for p in weights.list_proxies(context.scene) if p.sbweight.armature_name == arm.name
        ]
        count = len(to_remove)
        for p in to_remove:
            bpy.data.objects.remove(p, do_unlink=True)
        self.report({"INFO"}, i18n.t("removed", count=count))
        return {"FINISHED"}


class SBWEIGHT_OT_remove_selected_bbox(Operator):
    bl_idname = "sbweight.remove_selected_bbox"
    bl_label = "Remove Selected Boxes"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        return any(weights.is_proxy(o) for o in context.selected_objects)

    def execute(self, context):
        to_remove = [o for o in context.selected_objects if weights.is_proxy(o)]
        if not to_remove:
            self.report({"ERROR"}, i18n.t("no_proxy"))
            return {"CANCELLED"}
        count = len(to_remove)
        for p in to_remove:
            bpy.data.objects.remove(p, do_unlink=True)
        self.report({"INFO"}, i18n.t("removed", count=count))
        return {"FINISHED"}


class SBWEIGHT_OT_remove_all_bbox(Operator):
    bl_idname = "sbweight.remove_all_bbox"
    bl_label = "Remove All Boxes"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        return bool(weights.list_proxies(context.scene))

    def execute(self, context):
        to_remove = weights.list_proxies(context.scene)
        count = len(to_remove)
        for p in to_remove:
            bpy.data.objects.remove(p, do_unlink=True)
        self.report({"INFO"}, i18n.t("removed", count=count))
        return {"FINISHED"}


CLASSES = (
    SBWEIGHT_OT_create_bbox,
    SBWEIGHT_OT_refresh,
    SBWEIGHT_OT_apply_offset,
    SBWEIGHT_OT_remove_selected_bone_bbox,
    SBWEIGHT_OT_remove_armature_bbox,
    SBWEIGHT_OT_remove_selected_bbox,
    SBWEIGHT_OT_remove_all_bbox,
)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
