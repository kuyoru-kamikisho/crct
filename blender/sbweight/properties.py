# -*- coding: utf-8 -*-
from __future__ import annotations

import bpy
from bpy.props import (
    BoolProperty,
    EnumProperty,
    FloatProperty,
    PointerProperty,
    StringProperty,
)
from bpy.types import PropertyGroup

from . import i18n
from . import weights


SHAPE_ITEMS = (
    ("CUBE", "Cube", "Cubic bounding box"),
    ("SPHERE", "Sphere", "Spherical bounding box"),
)

LANG_ITEMS = (
    ("zh_CN", "中文", ""),
    ("en_US", "English", ""),
    ("ja_JP", "日本語", ""),
    ("ko_KR", "한국어", ""),
)


def _on_language_update(self, context):
    i18n.set_language(self.language)


def _on_proxy_shape_update(self, context):
    obj = getattr(self, "id_data", None)
    if obj is None or obj.type != "EMPTY":
        return
    obj.empty_display_type = "SPHERE" if self.shape == "SPHERE" else "CUBE"
    if not self.is_proxy:
        return
    weights.refresh_proxies([obj], normalize=context.scene.sbweight.auto_normalize)


def _on_weight_prop_update(self, context):
    obj = getattr(self, "id_data", None)
    if obj is None or not getattr(obj, "sbweight", None):
        return
    if not obj.sbweight.is_proxy:
        return
    weights.refresh_proxies([obj], normalize=context.scene.sbweight.auto_normalize)


def _on_weight_preview_update(self, context):
    from . import preview

    preview.on_preview_toggle(context.scene, self.weight_preview)


class SBWeightProxyProps(PropertyGroup):
    is_proxy: BoolProperty(name="Is Proxy", default=False)
    armature_name: StringProperty(name="Armature", default="")
    bone_name: StringProperty(name="Bone", default="")

    shape: EnumProperty(
        name="Shape",
        items=SHAPE_ITEMS,
        default="CUBE",
        update=_on_proxy_shape_update,
    )

    weight_center: FloatProperty(
        name="Center",
        default=1.0,
        min=0.0,
        max=1.0,
        update=_on_weight_prop_update,
    )
    weight_boundary: FloatProperty(
        name="Boundary",
        default=0.2,
        min=0.0,
        max=1.0,
        update=_on_weight_prop_update,
    )
    weight_v1: FloatProperty(name="V1", default=0.8, min=0.0, max=1.0, update=_on_weight_prop_update)
    weight_v2: FloatProperty(name="V2", default=0.8, min=0.0, max=1.0, update=_on_weight_prop_update)
    weight_v3: FloatProperty(name="V3", default=0.8, min=0.0, max=1.0, update=_on_weight_prop_update)
    weight_v4: FloatProperty(name="V4", default=0.8, min=0.0, max=1.0, update=_on_weight_prop_update)
    weight_v5: FloatProperty(name="V5", default=0.8, min=0.0, max=1.0, update=_on_weight_prop_update)
    weight_v6: FloatProperty(name="V6", default=0.8, min=0.0, max=1.0, update=_on_weight_prop_update)
    weight_v7: FloatProperty(name="V7", default=0.8, min=0.0, max=1.0, update=_on_weight_prop_update)
    weight_v8: FloatProperty(name="V8", default=0.8, min=0.0, max=1.0, update=_on_weight_prop_update)

    weight_offset: FloatProperty(
        name="Offset",
        default=0.0,
        soft_min=-1.0,
        soft_max=1.0,
        update=_on_weight_prop_update,
    )


class SBWeightSceneProps(PropertyGroup):
    language: EnumProperty(
        name="Language",
        items=LANG_ITEMS,
        default="zh_CN",
        update=_on_language_update,
    )
    shape: EnumProperty(
        name="Shape",
        items=SHAPE_ITEMS,
        default="CUBE",
    )
    auto_normalize: BoolProperty(
        name="Auto Normalize",
        default=True,
    )
    live_update: BoolProperty(
        name="Live Update",
        default=True,
    )
    weight_preview: BoolProperty(
        name="Weight Preview",
        description="Show weight heatmap on the mesh in Object mode via vertex colors",
        default=True,
        update=_on_weight_preview_update,
    )


CLASSES = (
    SBWeightProxyProps,
    SBWeightSceneProps,
)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    bpy.types.Object.sbweight = PointerProperty(type=SBWeightProxyProps)
    bpy.types.Scene.sbweight = PointerProperty(type=SBWeightSceneProps)
    i18n.set_language("zh_CN")


def unregister():
    if hasattr(bpy.types.Scene, "sbweight"):
        del bpy.types.Scene.sbweight
    if hasattr(bpy.types.Object, "sbweight"):
        del bpy.types.Object.sbweight
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
