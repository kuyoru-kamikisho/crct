from .functions import *


#
# UI
#


def draw_subpanel(layout, prefs, menu_name, label, icon):

    box = layout.box()
    row = box.row()
    row.alignment = "LEFT"
    row.prop(
        prefs,
        menu_name,
        icon="TRIA_DOWN" if getattr(prefs, menu_name) else "TRIA_RIGHT",
        icon_only=True,
        emboss=False,
    )
    row.label(text=label, icon=icon)

    return box, getattr(prefs, menu_name)


#


class GP_PT_physics_panel(Panel):
    """Creates a Panel in the scene context of the properties editor"""

    bl_idname = "OBJECT_PT_goophysics"
    bl_label = "工具"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Goo Physics"

    def draw(self, context):
        layout = self.layout
        pb = context.active_pose_bone
        scn = context.scene
        prefs = context.preferences.addons["goo_physics"].preferences

        if pb is not None:
            if (pb.gp_has_sb_physics or pb.gp_has_cl_physics or pb.gp_has_gn_physics or pb.gp_has_jg_physics) == False:
                box = layout.box()
                row = box.row(align=True)
                row.label(text="模式：")
                row = box.row(align=True)
                row.prop(prefs, "gp_physics_type", text="")

                if prefs.gp_physics_type == "GEO_NODES":
                    row = box.row(align=True)
                    row.operator(
                        "goophys.add_geonodes_physics_to_selected",
                        text="添加物理效果",
                    )
                    row.scale_y = 2.5

                if prefs.gp_physics_type == "SIMP_SOFTBODY":
                    row = box.row(align=True)
                    row.operator(
                        "goophys.add_soft_physics_to_selected",
                        text="添加物理效果",
                    )
                    row.scale_y = 2.5

                if prefs.gp_physics_type == "CLOTH":
                    row = box.row(align=True)
                    row.operator(
                        "goophys.add_cloth_physics_to_selected",
                        text="添加物理效果",
                    )
                    row.scale_y = 2.5

                if prefs.gp_physics_type == "JIGGLE":
                    row = box.row(align=True)
                    row.operator(
                        "goophys.add_jiggle_physics_to_selected",
                        text="添加物理效果",
                    )
                    row.scale_y = 2.5

            else:
                box = layout.box()
                row = box.row(align=True)
                row.operator(
                    "goophys.remove_physics_from_selected",
                    text="移除所选骨骼上的物理效果",
                )
                row.scale_y = 1.5

            #

                box = layout.box()
                row = box.row(align=True)
                row.operator("goophys.bake_physics", text="烘焙骨骼物理效果")
                row.scale_y = 2

                box = layout.box()
                row = box.row(align=True)
                row.operator("goophys.select_dynamic_bones", text="选择物理骨骼")

                row = box.row(align=True)
                row.operator("goophys.select_last_dynamic_bones", text="选择骨骼链末端骨骼")

                #

                box = layout.box()

                if pb.gp_has_cl_physics:
                    label = "布料物理设置"
                    icon = "MOD_CLOTH"

                    row = box.row(align=True)
                    row.label(text="预设：")
                    row = box.row(align=True)
                    row.prop(prefs, "cl_presets", text="")
                    row.operator("goophys.add_preset", text="", icon="ADD")
                    row.operator("goophys.delete_preset", text="", icon="REMOVE")

                    row = box.row(align=True)
                    row.operator("goophys.apply_preset", text="应用预设")

                if pb.gp_has_sb_physics:
                    label = "软体物理设置"
                    icon = "MOD_SOFT"

                    row = box.row(align=True)
                    row.label(text="预设：")
                    row = box.row(align=True)
                    row.prop(prefs, "sb_presets", text="")
                    row.operator("goophys.add_preset", text="", icon="ADD")
                    row.operator("goophys.delete_preset", text="", icon="REMOVE")

                    row = box.row(align=True)
                    row.operator("goophys.apply_preset", text="应用预设")

                if pb.gp_has_jg_physics:
                    label = "弹性物理设置"
                    icon = "MOD_SCREW"

                    row = box.row(align=True)
                    row.label(text="预设：")
                    row = box.row(align=True)
                    row.prop(prefs, "sp_presets", text="")
                    row.operator("goophys.add_preset", text="", icon="ADD")
                    row.operator("goophys.delete_preset", text="", icon="REMOVE")

                    row = box.row(align=True)
                    row.operator("goophys.apply_preset", text="应用预设")

                if pb.gp_has_gn_physics:
                    label = "几何节点物理设置"
                    icon = "GEOMETRY_NODES"

                    row = box.row(align=True)
                    row.label(text="预设：")
                    row = box.row(align=True)
                    row.prop(prefs, "gn_presets", text="")
                    row.operator("goophys.add_preset", text="", icon="ADD")
                    row.operator("goophys.delete_preset", text="", icon="REMOVE")

                    row = box.row(align=True)
                    row.operator("goophys.apply_preset", text="应用预设")

                boxx, expanded = draw_subpanel(box, prefs, "settings_menu", label, icon)
                if expanded:

                    if pb.gp_has_cl_physics:

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_chains")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "chain_menu", "骨骼链设置", "RESTRICT_INSTANCED_OFF")
                        if expanded:

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "cl_time_menu", "时间", "TIME")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_speed", text="模拟速度")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "cl_physical_menu", "物理属性", "MOD_SOLIDIFY")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_mass", text="模拟质量")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "cl_structure_menu", "结构", "SELECT_INTERSECT")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_air_dampening", text="模拟空气阻尼")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_bend_damping", text="模拟弯曲阻尼")

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_bones")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "bone_menu", "骨骼设置", "BONE_DATA")
                        if expanded:

                            row = boxxx.row(align=True)
                            row.prop(pb, "gp_sim_influence", text="模拟影响力")

                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="应用线性模拟影响力衰减",
                            ).type = 0
                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="应用二次模拟影响力衰减",
                            ).type = 1

                    if pb.gp_has_sb_physics:

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_bones")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "bone_menu", "骨骼设置", "BONE_DATA")
                        if expanded:

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sb_time_menu", "时间", "TIME")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_speed", text="模拟速度")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sb_physical_menu", "物理属性", "MOD_SOLIDIFY")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_friction", text="模拟摩擦力")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_mass", text="模拟质量")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sb_structure_menu", "结构", "SELECT_INTERSECT")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_stiffness", text="模拟刚度")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_damping", text="模拟阻尼")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_strength", text="模拟强度")

                            row = boxxx.row(align=True)
                            row.prop(pb, "gp_sim_influence", text="模拟影响力")

                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="应用线性模拟影响力衰减",
                            ).type = 0
                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="应用二次模拟影响力衰减",
                            ).type = 1

                    if pb.gp_has_jg_physics:

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_bones")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "bone_menu", "骨骼设置", "BONE_DATA")
                        if expanded:

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sb_time_menu", "时间", "TIME")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_speed", text="模拟速度")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sb_physical_menu", "物理属性", "MOD_SOLIDIFY")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_friction", text="模拟摩擦力")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_mass", text="模拟质量")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sp_physical_menu", "物理属性", "MOD_SOLIDIFY")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_stiffness", text="模拟刚度")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_damping", text="模拟阻尼")

                            row = boxxx.row(align=True)
                            row.prop(pb, "gp_sim_influence", text="模拟影响力")

                    if pb.gp_has_gn_physics:

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_chains")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "chain_menu", "骨骼链设置", "RESTRICT_INSTANCED_OFF")
                        if expanded:

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "gn_general_menu", "常规", "OUTLINER_DATA_GP_LAYER")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_velocity", text="速度缩放")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_dampening", text="速度阻尼")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_gravity", text="重力")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_root_falloff", text="根部衰减")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "gn_stiff_menu", "刚度", "AUTOMERGE_ON")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_stiffness", text="刚度")

                                row = boxxxx.row(align=True)
                                row.prop(
                                    pb, "gp_chain_stiff_end_fac", text="末端刚度系数"
                                )

                                boxxxxx, expanded = draw_subpanel(boxxxx, prefs, "gn_stiff_adv_menu", "高级刚度设置", "CON_TRANSLIKE")
                                if expanded:

                                    row = boxxxxx.row(align=True)
                                    row.prop(
                                        pb, "gp_chain_stiff_vel_fac", text="刚度速度系数"
                                    )

                                    row = boxxxxx.row(align=True)
                                    row.prop(
                                        pb, "gp_chain_stiff_vel_min", text="刚度速度下限"
                                    )

                                    row = boxxxxx.row(align=True)
                                    row.prop(
                                        pb, "gp_chain_stiff_vel_max", text="刚度速度上限"
                                    )

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "gn_wind_menu", "风力", "FORCE_WIND")
                            if expanded:
                                has_wind = False
                                ob = bpy.data.objects.get(pb.gp_sim_object)
                                mod = None
                                if ob:
                                    mod = ob.modifiers.get("GP_Nodes Sim")
                                    if mod:
                                        inputs = get_inputs_container(mod.node_group)
                                        has_wind = mod[inputs["Wind Object"].identifier] != None

                                if has_wind == False:

                                    row = boxxxx.row(align=True)
                                    row.operator(
                                        "goophys.add_wind_objects", text="为骨骼链添加风力控制器"
                                    )
                                    row.scale_y = 2.0

                                    boxxxx.separator()

                                    if mod is not None:
                                        row = boxxxx.row(align=True)
                                        row.prop(mod, '["' + inputs["Wind Object"].identifier + '"]', text="风力控制器")

                                else:

                                    row = boxxxx.row(align=True)
                                    row.prop(pb, "gp_chain_wind_strength", text="风力强度")

                                    row = boxxxx.row(align=True)
                                    row.prop(pb, "gp_chain_wind_noise_strength", text="风力噪波强度")

                                    row = boxxxx.row(align=True)
                                    row.prop(pb, "gp_chain_wind_noise_scale", text="风力噪波缩放")

                                    boxxxx.separator()

                                    if mod is not None:
                                        row = boxxxx.row(align=True)
                                        row.prop(mod, '["' + inputs["Wind Object"].identifier + '"]', text="风力控制器")

                                    row = boxxxx.row(align=True)
                                    row.operator(
                                        "goophys.copy_active_wind_controller",
                                        text="将风力控制器复制到所选骨骼链",
                                    )
                                    row.scale_y = 1.5

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "gn_collision_menu", "碰撞", "MOD_PHYSICS")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_use_collision", text="启用碰撞")

                                if pb.gp_chain_use_collision:
                                    row = boxxxx.row(align=True)
                                    row.prop(pb, "gp_chain_collision_dist", text="碰撞距离")

                                    row = boxxxx.row(align=True)
                                    row.prop(
                                        pb, "gp_chain_collision_friction", text="碰撞摩擦力"
                                    )

                                row = boxxxx.row(align=True)
                                row.operator(
                                    "goophys.refresh_geonodes_collision",
                                    text="刷新碰撞物体")

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_bones")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "bone_menu", "骨骼设置", "BONE_DATA")
                        if expanded:
                            row = boxxx.row(align=True)
                            row.prop(pb, "gp_sim_influence", text="模拟影响力")

                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="应用线性模拟影响力衰减",
                            ).type = 0
                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="应用二次模拟影响力衰减",
                            ).type = 1

        #

        elif context.mode == "POSE":
            box = layout.box()
            row = box.row(align=True)
            row.operator("goophys.select_dynamic_bones", text="选择物理骨骼")

            row = box.row(align=True)
            row.operator("goophys.select_last_dynamic_bones", text="选择骨骼链末端骨骼")

        box = layout.box()
        row = box.row(align=True)
        row.operator(
            "goophys.add_collider", text="根据所选物体创建碰撞体"
        )

        box, expanded = draw_subpanel(layout, prefs, "troubleshoot_menu", "故障排查", "ERROR")
        if expanded:
            row = box.row(align=True)
            row.operator("goophys.sync_frame_range", text="同步帧范围")

            row = box.row(align=True)
            row.operator(
                "goophys.refresh_physics_status", text="刷新骨骼物理状态"
            )


#
#
#


_classes = [
    GP_PT_physics_panel,
]


_register, _unregister = register_classes_factory(_classes)


def register():
    _register()

    try:
        load_user_presets_to_pref()
    except:
        pass


def unregister():
    _unregister()
