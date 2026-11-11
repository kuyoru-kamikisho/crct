# -*- coding: utf-8 -*-
from __future__ import annotations

import bpy
from bpy.types import Panel

from . import i18n
from . import weights


class SBWEIGHT_PT_main(Panel):
    bl_label = "SBWeight"
    bl_idname = "SBWEIGHT_PT_main"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "SBWeight"

    def draw_header(self, context):
        self.layout.label(text="", icon="MOD_VERTEX_WEIGHT")

    def draw(self, context):
        layout = self.layout
        scene_props = context.scene.sbweight
        i18n.set_language(scene_props.language)

        layout.prop(scene_props, "language", text=i18n.t("language"))
        layout.separator()

        box = layout.box()
        box.label(text=i18n.t("panel_create"), icon="ADD")
        box.prop(scene_props, "shape", text=i18n.t("shape"))
        box.prop(scene_props, "auto_normalize", text=i18n.t("auto_normalize"))
        box.prop(scene_props, "live_update", text=i18n.t("live_update"))
        box.operator("sbweight.create_bbox", text=i18n.t("create_bbox"), icon="CUBE")

        obj = context.active_object
        if weights.is_proxy(obj):
            props = obj.sbweight
            box = layout.box()
            box.label(text=i18n.t("panel_proxy"), icon="EMPTY_AXIS")
            box.label(text=f"{i18n.t('proxy_armature')}: {props.armature_name}")
            box.label(text=f"{i18n.t('proxy_bone')}: {props.bone_name}")
            box.prop(props, "shape", text=i18n.t("shape"))
            box.prop(obj, "empty_display_size", text="Size")
            box.prop(obj, "scale", text="Scale")
            box.operator("sbweight.refresh", text=i18n.t("refresh_weight"), icon="FILE_REFRESH")

            wbox = layout.box()
            wbox.label(text=i18n.t("panel_weight"), icon="GROUP_VERTEX")
            wbox.prop(props, "weight_center", text=i18n.t("weight_center"), slider=True)
            if props.shape == "SPHERE":
                wbox.prop(props, "weight_boundary", text=i18n.t("weight_boundary"), slider=True)
            else:
                col = wbox.column(align=True)
                col.prop(props, "weight_v1", text=i18n.t("weight_v1"), slider=True)
                col.prop(props, "weight_v2", text=i18n.t("weight_v2"), slider=True)
                col.prop(props, "weight_v3", text=i18n.t("weight_v3"), slider=True)
                col.prop(props, "weight_v4", text=i18n.t("weight_v4"), slider=True)
                col.prop(props, "weight_v5", text=i18n.t("weight_v5"), slider=True)
                col.prop(props, "weight_v6", text=i18n.t("weight_v6"), slider=True)
                col.prop(props, "weight_v7", text=i18n.t("weight_v7"), slider=True)
                col.prop(props, "weight_v8", text=i18n.t("weight_v8"), slider=True)

            obox = layout.box()
            obox.prop(props, "weight_offset", text=i18n.t("weight_offset"))
            obox.operator("sbweight.apply_offset", text=i18n.t("apply_offset"), icon="PLUS")

        cbox = layout.box()
        cbox.label(text=i18n.t("panel_clean"), icon="TRASH")
        mode = context.mode
        if mode in {"POSE", "PAINT_WEIGHT"}:
            cbox.operator(
                "sbweight.remove_selected_bone_bbox",
                text=i18n.t("remove_selected_bone_bbox"),
                icon="BONE_DATA",
            )
            cbox.operator(
                "sbweight.remove_armature_bbox",
                text=i18n.t("remove_armature_bbox"),
                icon="OUTLINER_OB_ARMATURE",
            )
        else:
            cbox.operator(
                "sbweight.remove_selected_bbox",
                text=i18n.t("remove_selected_bbox"),
                icon="X",
            )
            cbox.operator(
                "sbweight.remove_all_bbox",
                text=i18n.t("remove_all_bbox"),
                icon="TRASH",
            )


CLASSES = (SBWEIGHT_PT_main,)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
