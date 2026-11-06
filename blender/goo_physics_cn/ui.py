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
    bl_label = "Tools"
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
                row.label(text="Mode:")
                row = box.row(align=True)
                row.prop(prefs, "gp_physics_type", text="")

                if prefs.gp_physics_type == "GEO_NODES":
                    row = box.row(align=True)
                    row.operator(
                        "goophys.add_geonodes_physics_to_selected",
                        text="Add Physics",
                    )
                    row.scale_y = 2.5

                if prefs.gp_physics_type == "SIMP_SOFTBODY":
                    row = box.row(align=True)
                    row.operator(
                        "goophys.add_soft_physics_to_selected",
                        text="Add Physics",
                    )
                    row.scale_y = 2.5

                if prefs.gp_physics_type == "CLOTH":
                    row = box.row(align=True)
                    row.operator(
                        "goophys.add_cloth_physics_to_selected",
                        text="Add Physics",
                    )
                    row.scale_y = 2.5

                if prefs.gp_physics_type == "JIGGLE":
                    row = box.row(align=True)
                    row.operator(
                        "goophys.add_jiggle_physics_to_selected",
                        text="Add Physics",
                    )
                    row.scale_y = 2.5

            else:
                box = layout.box()
                row = box.row(align=True)
                row.operator(
                    "goophys.remove_physics_from_selected",
                    text="Remove Physics from Selected Bones",
                )
                row.scale_y = 1.5

            #

                box = layout.box()
                row = box.row(align=True)
                row.operator("goophys.bake_physics", text="Bake Bone Physics")
                row.scale_y = 2

                box = layout.box()
                row = box.row(align=True)
                row.operator("goophys.select_dynamic_bones", text="Select Physics Bones")

                row = box.row(align=True)
                row.operator("goophys.select_last_dynamic_bones", text="Select Last Bone in Chains")

                #

                box = layout.box()

                if pb.gp_has_cl_physics:
                    label = "Cloth Physics Settings"
                    icon = "MOD_CLOTH"
                        
                    row = box.row(align=True)
                    row.label(text="Presets:")
                    row = box.row(align=True)
                    row.prop(prefs, "cl_presets", text="")
                    row.operator("goophys.add_preset", text="", icon="ADD")
                    row.operator("goophys.delete_preset", text="", icon="REMOVE")

                    row = box.row(align=True)
                    row.operator("goophys.apply_preset", text="Apply Preset")

                if pb.gp_has_sb_physics:
                    label = "Soft Body Physics Settings"
                    icon = "MOD_SOFT"

                    row = box.row(align=True)
                    row.label(text="Presets:")
                    row = box.row(align=True)
                    row.prop(prefs, "sb_presets", text="")
                    row.operator("goophys.add_preset", text="", icon="ADD")
                    row.operator("goophys.delete_preset", text="", icon="REMOVE")

                    row = box.row(align=True)
                    row.operator("goophys.apply_preset", text="Apply Preset")

                if pb.gp_has_jg_physics:
                    label = "Jiggle Physics Settings"
                    icon = "MOD_SCREW"

                    row = box.row(align=True)
                    row.label(text="Presets:")
                    row = box.row(align=True)
                    row.prop(prefs, "sp_presets", text="")
                    row.operator("goophys.add_preset", text="", icon="ADD")
                    row.operator("goophys.delete_preset", text="", icon="REMOVE")

                    row = box.row(align=True)
                    row.operator("goophys.apply_preset", text="Apply Preset")

                if pb.gp_has_gn_physics:
                    label = "Geo Nodes Physics Settings"
                    icon = "GEOMETRY_NODES"

                    row = box.row(align=True)
                    row.label(text="Presets:")
                    row = box.row(align=True)
                    row.prop(prefs, "gn_presets", text="")
                    row.operator("goophys.add_preset", text="", icon="ADD")
                    row.operator("goophys.delete_preset", text="", icon="REMOVE")

                    row = box.row(align=True)
                    row.operator("goophys.apply_preset", text="Apply Preset")

                boxx, expanded = draw_subpanel(box, prefs, "settings_menu", label, icon)
                if expanded:

                    if pb.gp_has_cl_physics:
                        
                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_chains")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "chain_menu", "Chain Settings", "RESTRICT_INSTANCED_OFF")
                        if expanded:

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "cl_time_menu", "Time", "TIME")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_speed", text="Sim Speed")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "cl_physical_menu", "Physical", "MOD_SOLIDIFY")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_mass", text="Sim Mass")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "cl_structure_menu", "Structure", "SELECT_INTERSECT")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_air_dampening", text="Sim Air Dampening")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_bend_damping", text="Sim Bend Damping")

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_bones")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "bone_menu", "Bone Settings", "BONE_DATA")
                        if expanded:

                            row = boxxx.row(align=True)
                            row.prop(pb, "gp_sim_influence", text="Sim Influence")

                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="Apply Linear Sim Influence Falloff",
                            ).type = 0
                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="Apply Quadratic Sim Influence Falloff",
                            ).type = 1

                    if pb.gp_has_sb_physics:

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_bones")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "bone_menu", "Bone Settings", "BONE_DATA")
                        if expanded:

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sb_time_menu", "Time", "TIME")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_speed", text="Sim Speed")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sb_physical_menu", "Physical", "MOD_SOLIDIFY")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_friction", text="Sim Friction")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_mass", text="Sim Mass")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sb_structure_menu", "Structure", "SELECT_INTERSECT")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_stiffness", text="Sim Stiffness")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_damping", text="Sim Damping")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_strength", text="Sim Strength")

                            row = boxxx.row(align=True)
                            row.prop(pb, "gp_sim_influence", text="Sim Influence")

                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="Apply Linear Sim Influence Falloff",
                            ).type = 0
                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="Apply Quadratic Sim Influence Falloff",
                            ).type = 1

                    if pb.gp_has_jg_physics:

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_bones")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "bone_menu", "Bone Settings", "BONE_DATA")
                        if expanded:

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sb_time_menu", "Time", "TIME")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_speed", text="Sim Speed")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sb_physical_menu", "Physical", "MOD_SOLIDIFY")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_friction", text="Sim Friction")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_mass", text="Sim Mass")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "sp_physical_menu", "Physical", "MOD_SOLIDIFY")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_stiffness", text="Sim Stiffness")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_sim_damping", text="Sim Damping")

                            row = boxxx.row(align=True)
                            row.prop(pb, "gp_sim_influence", text="Sim Influence")

                    if pb.gp_has_gn_physics:

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_chains")
                    
                        boxxx, expanded = draw_subpanel(boxx, prefs, "chain_menu", "Chain Settings", "RESTRICT_INSTANCED_OFF")
                        if expanded:

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "gn_general_menu", "General", "OUTLINER_DATA_GP_LAYER")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_velocity", text="Velocity Scaler")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_dampening", text="Velocity Dampening")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_gravity", text="Gravity")

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_root_falloff", text="Root Falloff")

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "gn_stiff_menu", "Stiffness", "AUTOMERGE_ON")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_stiffness", text="Stiffness")

                                row = boxxxx.row(align=True)
                                row.prop(
                                    pb, "gp_chain_stiff_end_fac", text="Tip Stiffness Factor"
                                )

                                boxxxxx, expanded = draw_subpanel(boxxxx, prefs, "gn_stiff_adv_menu", "Advanced Stiffness", "CON_TRANSLIKE")
                                if expanded:

                                    row = boxxxxx.row(align=True)
                                    row.prop(
                                        pb, "gp_chain_stiff_vel_fac", text="Stiffness Velocity Factor"
                                    )

                                    row = boxxxxx.row(align=True)
                                    row.prop(
                                        pb, "gp_chain_stiff_vel_min", text="Stiffness Velocity Min"
                                    )

                                    row = boxxxxx.row(align=True)
                                    row.prop(
                                        pb, "gp_chain_stiff_vel_max", text="Stiffness Velocity Max"
                                    )

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "gn_wind_menu", "Wind", "FORCE_WIND")
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
                                        "goophys.add_wind_objects", text="Add Wind Controller to Chains"
                                    )
                                    row.scale_y = 2.0
                                    
                                    boxxxx.separator()

                                    if mod is not None:
                                        row = boxxxx.row(align=True)
                                        row.prop(mod, '["' + inputs["Wind Object"].identifier + '"]', text="Wind Controller")

                                else:

                                    row = boxxxx.row(align=True)
                                    row.prop(pb, "gp_chain_wind_strength", text="Wind Strength")

                                    row = boxxxx.row(align=True)
                                    row.prop(pb, "gp_chain_wind_noise_strength", text="Wind Noise Strength")

                                    row = boxxxx.row(align=True)
                                    row.prop(pb, "gp_chain_wind_noise_scale", text="Wind Noise Scale")

                                    boxxxx.separator()

                                    if mod is not None:
                                        row = boxxxx.row(align=True)
                                        row.prop(mod, '["' + inputs["Wind Object"].identifier + '"]', text="Wind Controller")

                                    row = boxxxx.row(align=True)
                                    row.operator(
                                        "goophys.copy_active_wind_controller",
                                        text="Copy Wind Controller to Selected Chains",
                                    )
                                    row.scale_y = 1.5

                            boxxxx, expanded = draw_subpanel(boxxx, prefs, "gn_collision_menu", "Collision", "MOD_PHYSICS")
                            if expanded:

                                row = boxxxx.row(align=True)
                                row.prop(pb, "gp_chain_use_collision", text="Use Collision")
                                
                                if pb.gp_chain_use_collision:
                                    row = boxxxx.row(align=True)
                                    row.prop(pb, "gp_chain_collision_dist", text="Collision Distance")

                                    row = boxxxx.row(align=True)
                                    row.prop(
                                        pb, "gp_chain_collision_friction", text="Collision Friction"
                                    )

                                row = boxxxx.row(align=True)
                                row.operator(
                                    "goophys.refresh_geonodes_collision",
                                    text="Refresh Collision Objects")

                        row = boxx.row(align=True)
                        row.prop(prefs, "apply_to_all_bones")

                        boxxx, expanded = draw_subpanel(boxx, prefs, "bone_menu", "Bone Settings", "BONE_DATA")
                        if expanded:
                            row = boxxx.row(align=True)
                            row.prop(pb, "gp_sim_influence", text="Sim Influence")

                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="Apply Linear Sim Influence Falloff",
                            ).type = 0
                            row = boxxx.row(align=True)
                            row.operator(
                                "goophys.apply_falloff_to_selected",
                                text="Apply Quadratic Sim Influence Falloff",
                            ).type = 1

        #

        elif context.mode == "POSE":
            box = layout.box()
            row = box.row(align=True)
            row.operator("goophys.select_dynamic_bones", text="Select Physics Bones")

            row = box.row(align=True)
            row.operator("goophys.select_last_dynamic_bones", text="Select Last Bone in Chains")

        box = layout.box()
        row = box.row(align=True)
        row.operator(
            "goophys.add_collider", text="Collider From Selected Objects"
        )

        box, expanded = draw_subpanel(layout, prefs, "troubleshoot_menu", "Troubleshooting", "ERROR")
        if expanded:
            row = box.row(align=True)
            row.operator("goophys.sync_frame_range", text="Sync Frame Range")

            row = box.row(align=True)
            row.operator(
                "goophys.refresh_physics_status", text="Refresh Bone Physics Status"
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
