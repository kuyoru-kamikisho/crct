from .functions import *
from bpy_extras import anim_utils


#
# OPERATORS
#


class GP_OT_refresh_geonodes_collision(Operator):
    bl_idname = "goophys.refresh_geonodes_collision"
    bl_label = "刷新碰撞物体"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "将所有启用了碰撞的物体移动到几何节点碰撞集合中"

    def execute(self, context):
        coll, collide_coll, control_coll, bake_coll = ensure_collections()

        add_obs = []
        for ob in context.view_layer.objects:
            if ob.type in ["MESH", "CURVES"]:
                for mod in ob.modifiers:
                    if mod.type == "COLLISION":
                        add_obs.append(ob)

        for i in range(len(collide_coll.objects)):
            collide_coll.objects.unlink(collide_coll.objects[0])
        
        for ob in add_obs:
            collide_coll.objects.link(ob)

        return {"FINISHED"}


class GP_OT_add_preset(Operator):
    bl_idname = "goophys.add_preset"
    bl_label = "添加预设"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "根据当前骨骼设置创建新预设"

    name: bpy.props.StringProperty(
        name="预设名称",
        description="预设名称",
        default="",
    )

    description: bpy.props.StringProperty(
        name="预设描述",
        description="预设描述",
        default="",
    )

    chain_preset: bpy.props.BoolProperty(
        name="骨骼链预设",
        description="此预设将保存整条骨骼链的骨骼设置参数曲线",
        default=True,
    )

    def execute(self, context):

        if self.name == "":
            self.report(
                {"ERROR"},
                "请填写预设名称后再保存",
            )
            return {"CANCELLED"}
        
        resample_amount = 50
        smooth_iters = 5

        pb = context.active_pose_bone
        p_dat = {}

        if self.chain_preset and pb.gp_has_jg_physics == False:
            p_dat["Name"] = self.name.replace("_CHAIN", "") + "_CHAIN"
        else:
            p_dat["Name"] = self.name

        p_dat["Description"] = self.description
        s_dat = {}

        sim_chains = get_partial_selected_bone_chains(context.selected_pose_bones_from_active_object, only_active=True)
        for chain in sim_chains:
            if pb.gp_has_cl_physics:
                
                s_dat["gp_chain_speed"] = pb.gp_chain_speed

                s_dat["gp_chain_mass"] = pb.gp_chain_mass

                s_dat["gp_chain_air_dampening"] = pb.gp_chain_air_dampening
                s_dat["gp_chain_bend_damping"] = pb.gp_chain_bend_damping
                
                if self.chain_preset:
                    s_dat["gp_sim_influence"] = []

                    for b_dat in chain:
                        bo = b_dat[0].pose.bones[b_dat[1]]

                        s_dat["gp_sim_influence"].append(bo.gp_sim_influence)
                else:
                    s_dat["gp_sim_influence"] = pb.gp_sim_influence
                
                preset_fp = Path(os.path.dirname(__file__)) / "presets" / "cloth_presets.json"

            elif pb.gp_has_sb_physics:
                
                if self.chain_preset:
                    s_dat["gp_sim_speed"] = []

                    s_dat["gp_sim_friction"] = []
                    s_dat["gp_sim_mass"] = []
                    
                    s_dat["gp_sim_stiffness"] = []
                    s_dat["gp_sim_damping"] = []
                    s_dat["gp_sim_strength"] = []

                    s_dat["gp_sim_influence"] = []

                    for b_dat in chain:
                        bo = b_dat[0].pose.bones[b_dat[1]]

                        s_dat["gp_sim_speed"].append(bo.gp_sim_speed)

                        s_dat["gp_sim_friction"].append(bo.gp_sim_friction)
                        s_dat["gp_sim_mass"].append(bo.gp_sim_mass)
                        
                        s_dat["gp_sim_stiffness"].append(bo.gp_sim_stiffness)
                        s_dat["gp_sim_damping"].append(bo.gp_sim_damping)
                        s_dat["gp_sim_strength"].append(bo.gp_sim_strength)

                        s_dat["gp_sim_influence"].append(bo.gp_sim_influence)
                else:
                    s_dat["gp_sim_speed"] = pb.gp_sim_speed

                    s_dat["gp_sim_friction"] = pb.gp_sim_friction
                    s_dat["gp_sim_mass"] = pb.gp_sim_mass
                    
                    s_dat["gp_sim_stiffness"] = pb.gp_sim_stiffness
                    s_dat["gp_sim_damping"] = pb.gp_sim_damping
                    s_dat["gp_sim_strength"] = pb.gp_sim_strength

                    s_dat["gp_sim_influence"] = pb.gp_sim_influence

                preset_fp = Path(os.path.dirname(__file__)) / "presets" / "soft_body_presets.json"

            elif pb.gp_has_jg_physics:
            
                s_dat["gp_sim_speed"] = pb.gp_sim_speed

                s_dat["gp_sim_friction"] = pb.gp_sim_friction
                s_dat["gp_sim_mass"] = pb.gp_sim_mass
                
                s_dat["gp_sim_stiffness"] = pb.gp_sim_stiffness
                s_dat["gp_sim_damping"] = pb.gp_sim_damping

                s_dat["gp_sim_influence"] = pb.gp_sim_influence

                preset_fp = Path(os.path.dirname(__file__)) / "presets" / "jiggle_spring_presets.json"

            elif pb.gp_has_gn_physics:

                s_dat["gp_chain_velocity"] = pb.gp_chain_velocity
                s_dat["gp_chain_dampening"] = pb.gp_chain_dampening
                s_dat["gp_chain_gravity"] = pb.gp_chain_gravity
                s_dat["gp_chain_root_falloff"] = pb.gp_chain_root_falloff

                s_dat["gp_chain_stiffness"] = pb.gp_chain_stiffness
                s_dat["gp_chain_stiff_end_fac"] = pb.gp_chain_stiff_end_fac
                s_dat["gp_chain_stiff_vel_fac"] = pb.gp_chain_stiff_vel_fac
                s_dat["gp_chain_stiff_vel_min"] = pb.gp_chain_stiff_vel_min
                s_dat["gp_chain_stiff_vel_max"] = pb.gp_chain_stiff_vel_max

                s_dat["gp_chain_wind_strength"] = pb.gp_chain_wind_strength
                s_dat["gp_chain_wind_noise_strength"] = pb.gp_chain_wind_noise_strength
                s_dat["gp_chain_wind_noise_scale"] = pb.gp_chain_wind_noise_scale

                s_dat["gp_chain_collision_dist"] = pb.gp_chain_collision_dist
                s_dat["gp_chain_collision_friction"] = pb.gp_chain_collision_friction

                if self.chain_preset:
                    s_dat["gp_sim_influence"] = []

                    for b_dat in chain:
                        bo = b_dat[0].pose.bones[b_dat[1]]

                        s_dat["gp_sim_influence"].append(bo.gp_sim_influence)
                else:
                    s_dat["gp_sim_influence"] = pb.gp_sim_influence

                preset_fp = Path(os.path.dirname(__file__)) / "presets" / "geo_nodes_presets.json"

            # Resample the values profile and smooth the inbetween values
            for k in s_dat.keys():
                if isinstance(s_dat[k], list) == False:
                    continue

                vals = np.array(s_dat[k], dtype=np.float32)

                source_t_vals = np.arange(vals.shape[0], dtype=np.float32) / (vals.shape[0] - 1)

                t_vals = np.arange(resample_amount, dtype=np.float32) / (resample_amount - 1)

                tar_inds = np.searchsorted(source_t_vals, t_vals)

                p_inds = tar_inds - 1
                tar_inds[0] = 1
                p_inds[0] = 0

                l_range = source_t_vals[tar_inds] - source_t_vals[p_inds]
                l_fac = (t_vals - source_t_vals[p_inds]) / l_range

                lerp_vals = vals[p_inds] + (vals[tar_inds] - vals[p_inds]) * l_fac

                inds = np.arange(lerp_vals.shape[0]-2, dtype=np.int32) + 1
                next_inds = inds + 1
                prev_inds = inds - 1

                for i in range(smooth_iters):
                    neighbors = (lerp_vals[next_inds] + lerp_vals[prev_inds]) * 0.5

                    lerp_vals[inds] = lerp_vals[inds] * 0.5 + neighbors * 0.5

                s_dat[k] = lerp_vals.tolist()

        p_dat["Settings"] = s_dat

        presets_data = {}
        if os.path.exists(preset_fp):
            presets_data = json.load(open(str(preset_fp)))

        presets_data[self.name.replace(" ", "").upper()] = p_dat

        preset_file = open(preset_fp, "w")

        json.dump(presets_data, preset_file, indent=1, ensure_ascii=True)

        preset_file.close()

        return {"FINISHED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=800)

    def draw(self, context):
        layout = self.layout
        
        row = layout.row()
        row.prop(self, "name")

        row = layout.row()
        row.prop(self, "description")

        if context.active_pose_bone.gp_has_jg_physics == False:
            row = layout.row()
            row.prop(self, "chain_preset")


class GP_OT_delete_preset(Operator):
    bl_idname = "goophys.delete_preset"
    bl_label = "删除预设"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "删除当前预设"

    def execute(self, context):
        prefs = context.preferences.addons["goo_physics"].preferences

        pb = context.active_pose_bone
        if pb.gp_has_cl_physics:
            preset_fp = Path(os.path.dirname(__file__)) / "presets" / "cloth_presets.json"
            presets_enum = prefs.cl_presets

        elif pb.gp_has_sb_physics:
            preset_fp = Path(os.path.dirname(__file__)) / "presets" / "soft_body_presets.json"
            presets_enum = prefs.sb_presets

        elif pb.gp_has_jg_physics:
            preset_fp = Path(os.path.dirname(__file__)) / "presets" / "jiggle_spring_presets.json"
            presets_enum = prefs.sp_presets

        elif pb.gp_has_gn_physics:
            preset_fp = Path(os.path.dirname(__file__)) / "presets" / "geo_nodes_presets.json"
            presets_enum = prefs.gn_presets

        presets_data = {}
        if os.path.exists(preset_fp):
            presets_data = json.load(open(str(preset_fp)))

            if presets_enum.replace(" ", "").upper() in presets_data.keys():
                del presets_data[presets_enum.replace(" ", "").upper()]

            preset_file = open(preset_fp, "w")

            json.dump(presets_data, preset_file, indent=1, ensure_ascii=True)

            preset_file.close()

            presets_enum = 0
            
        return {"FINISHED"}

    def invoke(self, context, event):
        prefs = context.preferences.addons["goo_physics"].preferences

        pb = context.active_pose_bone
        if pb.gp_has_cl_physics:
            preset_fp = Path(os.path.dirname(__file__)) / "presets" / "cloth_presets.json"
            presets_enum = prefs.cl_presets

        elif pb.gp_has_sb_physics:
            preset_fp = Path(os.path.dirname(__file__)) / "presets" / "soft_body_presets.json"
            presets_enum = prefs.sb_presets

        elif pb.gp_has_jg_physics:
            preset_fp = Path(os.path.dirname(__file__)) / "presets" / "jiggle_spring_presets.json"
            presets_enum = prefs.sp_presets

        elif pb.gp_has_gn_physics:
            preset_fp = Path(os.path.dirname(__file__)) / "presets" / "geo_nodes_presets.json"
            presets_enum = prefs.gn_presets

        if presets_enum in ["DEFAULTSOFTBODY", 
                            "DEFAULTGEONODES", 
                            "DEFAULTJIGGLE", 
                            "DEFAULTCLOTH",
                            "FLOPPYCLOTH",
                            "HAIRFRINGE",
                            "HAIRSIDE",
                            "HAIRPONYTAIL",
                            "JIGGLELOOSE",
                            "JIGGLESTIFF",
                            "SLOWMO",
                            "GOOFLAPPY",
                            "GOOSTIFF",
                            "METAL/JEWELRY",
                            "GOOSIM",
                            "STIFFCLOTH",
                            "FLOPPYCLOTH",]:
            self.report(
                {"ERROR"},
                "无法删除内置预设",
            )
            return {"CANCELLED"}

        return context.window_manager.invoke_props_dialog(self, width=400, confirm_text="删除预设? Cannot be recovered")


class GP_OT_apply_preset(Operator):
    bl_idname = "goophys.apply_preset"
    bl_label = "应用预设"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "将当前预设应用到选中的骨骼/骨骼链"

    def execute(self, context):
        pb = context.active_pose_bone

        preset_data = get_preset_data()
        if preset_data is None:
            self.report(
                {"ERROR"},
                "当前活动姿态骨骼尚未启用物理模拟",
            )
            return {"CANCELLED"}
    
        apply_preset(preset_data, pb)
    
        return {"FINISHED"}


class GP_OT_select_dynamic_bones(Operator):
    bl_idname = "goophys.select_dynamic_bones"
    bl_label = "选择物理骨骼"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "选择所有已启用物理模拟的骨骼"

    def execute(self, context):
        for pb in context.visible_pose_bones:
            if pb.gp_has_sb_physics or pb.gp_has_cl_physics or pb.gp_has_gn_physics or pb.gp_has_jg_physics:
                if bpy.app.version[0] >= 5:
                    pb.select = True
                else:
                    pb.bone.select = True

        return {"FINISHED"}


class GP_OT_select_last_dynamic_bone(Operator):
    bl_idname = "goophys.select_last_dynamic_bones"
    bl_label = "选择骨骼链末端"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "选择动态骨骼链中的最后一根骨骼"

    def execute(self, context):
        for pb in context.visible_pose_bones:
            if pb.gp_has_sb_physics or pb.gp_has_cl_physics or pb.gp_has_gn_physics or pb.gp_has_jg_physics:

                not_last = False
                for child in pb.children_recursive:
                    if child.gp_has_sb_physics or child.gp_has_cl_physics or child.gp_has_gn_physics or pb.gp_has_jg_physics:
                        not_last = True
                
                if bpy.app.version[0] >= 5:
                    pb.select = not not_last
                else:
                    pb.bone.select = not not_last

        return {"FINISHED"}


class GP_OT_add_geonodes_physics_to_selected(Operator):
    bl_idname = "goophys.add_geonodes_physics_to_selected"
    bl_label = "为选中骨骼添加物理模拟"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "为选中的骨骼链添加几何节点动态网格"

    def execute(self, context):
        prefs = context.preferences.addons["goo_physics"].preferences

        coll, collide_coll, control_coll, bake_coll = ensure_collections()

        sim_chains = get_bone_chains(context.selected_pose_bones)

        if len(sim_chains) == 0:
            self.report(
                {"ERROR"},
                "所选骨骼均无法进行模拟。骨骼必须具有父级骨骼才能使用此功能",
            )

        # remove existing physics from selected bones
        clear_sim_chains(sim_chains)

        # cur_frame = context.scene.frame_current
        context.scene.frame_set(context.scene.frame_start)

        sim_soft_obs = create_geonodes_chains(
            sim_chains, coll, collide_coll, prefs.gp_divisions
        )

        preset_data = get_preset_data()
        if preset_data is not None:
            apply_preset(preset_data, context.active_pose_bone)

        return {"FINISHED"}


class GP_OT_add_soft_physics_to_selected(Operator):
    bl_idname = "goophys.add_soft_physics_to_selected"
    bl_label = "为选中骨骼添加物理模拟"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "为选中的骨骼链添加软体动态网格"

    def execute(self, context):
        
        coll, collide_coll, control_coll, bake_coll = ensure_collections()

        sim_chains = get_bone_chains(context.selected_pose_bones)

        if len(sim_chains) == 0:
            self.report(
                {"ERROR"},
                "所选骨骼均无法进行模拟。骨骼必须具有父级骨骼才能使用此功能",
            )

        # remove existing physics from selected bones
        clear_sim_chains(sim_chains)

        sim_soft_obs = create_soft_chains(sim_chains, coll)

        # cur_frame = context.scene.frame_current
        context.scene.frame_set(context.scene.frame_start)

        preset_data = get_preset_data()
        if preset_data is not None:
            apply_preset(preset_data, context.active_pose_bone)

        return {"FINISHED"}


class GP_OT_add_cloth_physics_to_selected(Operator):
    bl_idname = "goophys.add_cloth_physics_to_selected"
    bl_label = "为选中骨骼添加物理模拟"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "为选中的骨骼链添加软体动态网格"

    def execute(self, context):
        
        coll, collide_coll, control_coll, bake_coll = ensure_collections()

        sim_chains = get_bone_chains(context.selected_pose_bones)

        if len(sim_chains) == 0:
            self.report(
                {"ERROR"},
                "所选骨骼均无法进行模拟。骨骼必须具有父级骨骼才能使用此功能",
            )

        # remove existing physics from selected bones
        clear_sim_chains(sim_chains)

        sim_cloth_obs = create_cloth_chains(sim_chains, coll)

        # cur_frame = context.scene.frame_current
        context.scene.frame_set(context.scene.frame_start)

        preset_data = get_preset_data()
        if preset_data is not None:
            apply_preset(preset_data, context.active_pose_bone)

        return {"FINISHED"}


class GP_OT_add_jiggle_physics_to_selected(Operator):
    bl_idname = "goophys.add_jiggle_physics_to_selected"
    bl_label = "为选中骨骼添加物理模拟"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "为选中的骨骼链添加软体动态网格"

    def execute(self, context):
        
        coll, collide_coll, control_coll, bake_coll = ensure_collections()

        sim_chains = []
        for bo in context.selected_pose_bones:
            if bo.parent is not None and bo.bone.use_connect == False:
                sim_chains.append([[bo.id_data, bo.name]])

        if len(sim_chains) == 0:
            self.report(
                {"ERROR"},
                "所选骨骼均无法进行模拟。骨骼必须具有非连接的父级关系（保持偏移）才能使用此功能",
            )

        # remove existing physics from selected bones
        clear_sim_chains(sim_chains)

        sim_spring_obs = create_spring_chains(sim_chains, coll)

        # cur_frame = context.scene.frame_current
        context.scene.frame_set(context.scene.frame_start)

        preset_data = get_preset_data()
        if preset_data is not None:
            apply_preset(preset_data, context.active_pose_bone)

        return {"FINISHED"}


class GP_OT_remove_physics_from_selected(Operator):
    bl_idname = "goophys.remove_physics_from_selected"
    bl_label = "移除选中骨骼的物理模拟"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "移除分配给选中骨骼的软体动态网格"

    def execute(self, context):
        sim_chains = get_bone_chains(context.selected_pose_bones)

        if len(sim_chains) == 0:
            return {"FINISHED"}

        clear_sim_chains(sim_chains)

        return {"FINISHED"}


class GP_OT_sync_frame_range(Operator):
    bl_idname = "goophys.sync_frame_range"
    bl_label = "同步帧范围"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "将所有软体模拟物体同步到当前帧范围"

    def execute(self, context):

        coll, collide_coll, control_coll, bake_coll = ensure_collections()

        if coll:
            for ob in coll.objects:
                mod = ob.modifiers.get("GP_SoftBody Sim")
                if mod:
                    if context.scene.use_preview_range:
                        mod.point_cache.frame_start = (
                            bpy.context.scene.frame_preview_start
                        )
                        mod.point_cache.frame_end = bpy.context.scene.frame_preview_end
                    else:
                        mod.point_cache.frame_start = bpy.context.scene.frame_start
                        mod.point_cache.frame_end = bpy.context.scene.frame_end

                mod = ob.modifiers.get("GP_Jiggle Sim")
                if mod:
                    if context.scene.use_preview_range:
                        mod.point_cache.frame_start = (
                            bpy.context.scene.frame_preview_start
                        )
                        mod.point_cache.frame_end = bpy.context.scene.frame_preview_end
                    else:
                        mod.point_cache.frame_start = bpy.context.scene.frame_start
                        mod.point_cache.frame_end = bpy.context.scene.frame_end

                mod = ob.modifiers.get("GP_Cloth Sim")
                if mod:
                    if context.scene.use_preview_range:
                        mod.point_cache.frame_start = (
                            bpy.context.scene.frame_preview_start
                        )
                        mod.point_cache.frame_end = bpy.context.scene.frame_preview_end
                    else:
                        mod.point_cache.frame_start = bpy.context.scene.frame_start
                        mod.point_cache.frame_end = bpy.context.scene.frame_end

        return {"FINISHED"}


class GP_OT_refresh_physics_status(Operator):
    bl_idname = "goophys.refresh_physics_status"
    bl_label = "刷新物理状态"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "将所有软体模拟物体同步到当前帧范围"

    def execute(self, context):

        coll, collide_coll, control_coll, bake_coll = ensure_collections()

        if coll:
            skips = []
            for ob in coll.objects:
                if len(ob.gp_bone_coll.coll) == 0:
                    continue

                mod = ob.modifiers.get("GP_SoftBody Sim")
                has_sb = mod is not None
                if has_sb:
                    mod.show_viewport = True
                    ob.location = ob.location

                mod = ob.modifiers.get("GP_Jiggle Sim")
                has_jp = mod is not None
                if has_jp:
                    mod.show_viewport = True
                    ob.location = ob.location

                mod = ob.modifiers.get("GP_Cloth Sim")
                has_cl = mod is not None
                if has_cl:
                    mod.show_viewport = True
                    ob.location = ob.location

                mod = ob.modifiers.get("GP_Nodes Sim")
                has_gn = mod is not None
                if has_gn:
                    mod.show_viewport = True
                    ob.location = ob.location

                for c_ob in ob.gp_bone_coll.coll:
                    if c_ob.rig_object not in bpy.data.objects:
                        continue

                    rig = bpy.data.objects[c_ob.rig_object]

                    if rig not in skips:
                        skips.append(rig)

                        if (
                            rig.animation_data is not None
                            and rig.animation_data.action is not None
                        ):
                            
                            if bpy.app.version[0] >= 5:
                                act = rig.animation_data.action
                                fcs = []
                                for slot in act.slots:
                                    fcs.append(anim_utils.action_get_channelbag_for_slot(act, slot))
                            else:
                                fcs = [rig.animation_data.action]

                            for slot in fcs:
                                rem_curves = []
                                for fc in slot.fcurves:
                                    if (
                                        "gp_has_cl_physics" in fc.data_path
                                        or "gp_has_sb_physics" in fc.data_path
                                        or "gp_has_jg_physics" in fc.data_path
                                    ):
                                        rem_curves.append(fc)

                                for fc in rem_curves:
                                    fcs.remove(fc)

                    if c_ob.rig_bone not in rig.pose.bones:
                        continue

                    bone = rig.pose.bones[c_ob.rig_bone]

                    bone.gp_has_sb_physics = has_sb
                    bone.gp_has_jg_physics = has_jp
                    bone.gp_has_cl_physics = has_cl
                    bone.gp_has_gn_physics = has_gn

        return {"FINISHED"}


class GP_OT_apply_falloff_to_selected(Operator):
    bl_idname = "goophys.apply_falloff_to_selected"
    bl_label = "为选中骨骼应用衰减"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "为选中的动态骨骼链应用线性或二次衰减。链条末端将更多地跟随模拟运动，根部则更多地跟随动画运动"

    type: bpy.props.IntProperty()

    def execute(self, context):
        sim_chains = get_partial_selected_bone_chains(context.selected_pose_bones)

        for chain in sim_chains:
            for p, p_dat in enumerate(chain):
                p_dat[0].pose.bones[p_dat[1]].gp_update = False

        for chain in sim_chains:
            tot_len = len(chain)

            for p, p_dat in enumerate(chain):
                val = (p + 1) / tot_len

                if self.type == 0:
                    inf = val

                elif self.type == 1:
                    inf = 1 - get_falloff(val)

                pb = p_dat[0].pose.bones[p_dat[1]]
                pb.gp_sim_influence = inf
                track_cons = pb.constraints.get("GP_Track")
                if track_cons:
                    track_cons.influence = inf

        for chain in sim_chains:
            for p, p_dat in enumerate(chain):
                p_dat[0].pose.bones[p_dat[1]].gp_update = True

        return {"FINISHED"}


class GP_OT_add_collider(Operator):
    bl_idname = "goophys.add_collider"
    bl_label = "根据选中物体创建碰撞体"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "创建新的碰撞体物体并将其添加到列表中"

    convex_hull: bpy.props.BoolProperty(name="凸包碰撞体", default=False, description="将每个碰撞物体转换为凸包网格，以简化碰撞网格")

    def execute(self, context):
        
        coll, collide_coll, control_coll, bake_coll = ensure_collections()

        link_fp = Path(os.path.dirname(__file__)) / "gp_sim_nodes_tree.blend"

        comb_ob_ng = bpy.data.node_groups.get("GooPhysics_CombineObjects")
        if comb_ob_ng is None:
            with bpy.data.libraries.load(
                str(link_fp), relative=True
            ) as (data_from, data_to):
                data_to.node_groups = [
                    nt
                    for nt in data_from.node_groups
                    if nt in ["GooPhysics_CombineObjects"]
                ]

            comb_ob_ng = data_to.node_groups[0]

        collider_obs = []
        for ob in bpy.context.selected_objects:
            if ob.type == "MESH":
                collider_obs.append(ob)

        sel_obs_name = "GP_Selected_Collision Objects"

        collider_object = create_collider_object(
            collider_obs, sel_obs_name, collide_coll, comb_ob_ng, convex_hull=self.convex_hull
        )
        collider_object.display_type = "WIRE"
        collider_object.data.update()
    
        collider_object.modifiers.new("Collision", "COLLISION")

        return {"FINISHED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=400)

    def draw(self, context):
        layout = self.layout

        row = layout.row()
        row.prop(self, "convex_hull")


class GP_OT_add_wind_object(Operator):
    bl_idname = "goophys.add_wind_objects"
    bl_label = "为骨骼链添加风力控制器"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "为选中的骨骼链添加风力物体"

    def execute(self, context):
        
        coll, collide_coll, control_coll, bake_coll = ensure_collections()

        wind_emp = bpy.data.objects.new("GP_Wind_Controller_(Scale_for_Power)", None)
        wind_emp.empty_display_size = 1.25
        wind_emp.empty_display_type = "SINGLE_ARROW"
        control_coll.objects.link(wind_emp)

        wind_loc = (0,0,5)

        if context.active_pose_bone is not None:
            wind_loc = context.active_pose_bone.id_data.matrix_world @ context.active_pose_bone.head
            wind_loc[2] += 0.5

        wind_emp.location = wind_loc
        wind_emp.rotation_euler = (-1.5708,0,0)
        wind_emp.select_set(True)

        for pb in context.selected_pose_bones:
            if pb.gp_has_gn_physics:
                ob = bpy.data.objects.get(pb.gp_sim_object)
                if ob:
                    mod = ob.modifiers.get("GP_Nodes Sim")
                    if mod:
                        inputs = get_inputs_container(mod.node_group)
                        mod[inputs["Wind Object"].identifier] = wind_emp

                    ob.location = ob.location

        return {"FINISHED"}


class GP_OT_copy_active_wind_controller(Operator):
    bl_idname = "goophys.copy_active_wind_controller"
    bl_label = "将风力控制器复制到选中的骨骼链"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = "将当前活动骨骼链的风力物体应用到选中的骨骼链"

    def execute(self, context):
        coll = bpy.data.collections.get("Goo Physics Controllers")
        if coll is not None:
            wind_emp = None
            if context.active_pose_bone.gp_has_gn_physics:
                ob = bpy.data.objects.get(context.active_pose_bone.gp_sim_object)
                if ob:
                    mod = ob.modifiers.get("GP_Nodes Sim")
                    if mod:
                        inputs = get_inputs_container(mod.node_group)
                        wind_emp = mod[inputs["Wind Object"].identifier]

                        ob.location = ob.location

            if wind_emp is not None:
                for pb in context.selected_pose_bones:
                    if pb.gp_has_gn_physics:
                        ob = bpy.data.objects.get(pb.gp_sim_object)
                        if ob:
                            mod = ob.modifiers.get("GP_Nodes Sim")
                            if mod:
                                inputs = get_inputs_container(mod.node_group)
                                mod[inputs["Wind Object"].identifier] = wind_emp

                                ob.location = ob.location

        return {"FINISHED"}


class GP_OT_bake_physics(Operator):
    bl_idname = "goophys.bake_physics"
    bl_label = "烘焙骨骼物理"
    bl_options = {"REGISTER", "UNDO", "INTERNAL"}
    bl_description = (
        "将骨骼物理模拟烘焙为当前骨架动作中的关键帧"
    )

    use_magic: bpy.props.BoolProperty(name="使用 Magic Empties", default=False, description="使用 Magic Empties 设置烘焙骨骼物理")
    sep_action: bpy.props.BoolProperty(name="烘焙到新动作", default=False, description="将物理模拟烘焙为新动作中的关键帧，而不是覆盖现有动作")

    def execute(self, context):
        prefs = context.preferences.addons["goo_physics"].preferences

        coll, collide_coll, control_coll, bake_coll = ensure_collections()
        coll.hide_viewport = False
        collide_coll.hide_viewport = False
        control_coll.hide_viewport = False

        chain_ids, rigs = [], []
        for bo in context.selected_pose_bones:
            if (bo.gp_has_sb_physics or bo.gp_has_cl_physics or bo.gp_has_gn_physics) and bo.gp_chain_id not in chain_ids:

                if [bo.id_data, bo.gp_chain_id] not in chain_ids:
                    chain_ids.append([bo.id_data, bo.gp_chain_id])

                if bo.id_data not in rigs:
                    rigs.append(bo.id_data)

        sim_chains = get_partial_selected_bone_chains(context.selected_pose_bones)

        if len(sim_chains) == 0:
            self.report(
                {"ERROR"},
                "Could not find any bone chains to bake. Try using 刷新物理状态",
            )

        skip_rigs = []
        for c, chain in enumerate(sim_chains):
            
            for b, bo_dat in enumerate(chain):
                rig = bo_dat[0]
                bo = rig.pose.bones[bo_dat[1]]
                
                if b == 0 and rig not in skip_rigs:
                    # Unselect bones of rigs so they dont all bake only physics bones bake
                    skip_rigs.append(rig)

                    chain_vis = []
                    rig.hide_viewport = False
                    rig.hide_select = False
                    for pb in rig.pose.bones:
                        if bpy.app.version[0] >= 5:
                            pb.select = False
                        else:
                            pb.bone.select = False
                                
                    rig.select_set(True)
                    context.view_layer.objects.active = rig

                    # Store bone layer/collection visibilities to restore after bake
                    coll_vis = []
                    if bpy.app.version[0] >= 4:
                        for bo_coll in rig.data.collections:
                            coll_vis.append(bo_coll.is_visible)
                            bo_coll.is_visible = True
                    else:
                        for l, layer in enumerate(rig.data.layers):
                            coll_vis.append(rig.data.layers[l])
                            rig.data.layers[l] = True

                    chain_vis.append([rig, coll_vis.copy()])
                
                    # Set physics object to right frame range for softbody and cloth
                    phys_ob = bpy.data.objects.get(bo.gp_sim_object)
                    if phys_ob:
                        mod = phys_ob.modifiers.get("GP_SoftBody Sim")
                        if mod:
                            if context.scene.use_preview_range:
                                mod.point_cache.frame_start = (
                                    bpy.context.scene.frame_preview_start
                                )
                                mod.point_cache.frame_end = (
                                    bpy.context.scene.frame_preview_end
                                )
                            else:
                                mod.point_cache.frame_start = bpy.context.scene.frame_start
                                mod.point_cache.frame_end = bpy.context.scene.frame_end
                                
                        mod = phys_ob.modifiers.get("GP_Jiggle Sim")
                        if mod:
                            if context.scene.use_preview_range:
                                mod.point_cache.frame_start = (
                                    bpy.context.scene.frame_preview_start
                                )
                                mod.point_cache.frame_end = (
                                    bpy.context.scene.frame_preview_end
                                )
                            else:
                                mod.point_cache.frame_start = bpy.context.scene.frame_start
                                mod.point_cache.frame_end = bpy.context.scene.frame_end

                        mod = phys_ob.modifiers.get("GP_Cloth Sim")
                        if mod:
                            if context.scene.use_preview_range:
                                mod.point_cache.frame_start = (
                                    bpy.context.scene.frame_preview_start
                                )
                                mod.point_cache.frame_end = (
                                    bpy.context.scene.frame_preview_end
                                )
                            else:
                                mod.point_cache.frame_start = bpy.context.scene.frame_start
                                mod.point_cache.frame_end = bpy.context.scene.frame_end

                        phys_ob.location = phys_ob.location
                
                if bpy.app.version[0] >= 5:
                    bo.select = True
                else:
                    bo.bone.select = True

        #

        if (is_addon_enabled("goo_anim_utils") or is_addon_enabled("magic_empties")) and self.use_magic:

            if context.scene.use_preview_range:
                try:
                    bpy.ops.object.bake_to_empties(
                        frame_start=context.scene.frame_preview_start,
                        frame_end=context.scene.frame_preview_end,
                        use_scene=False,
                    )
                except:
                    bpy.ops.object.bake_to_empties(
                        frame_start=context.scene.frame_preview_start,
                        frame_end=context.scene.frame_preview_end,
                        use_scene=False,
                    )

            else:
                try:
                    bpy.ops.object.bake_to_empties(
                        frame_start=context.scene.frame_start,
                        frame_end=context.scene.frame_end,
                        use_scene=True,
                    )
                except:
                    bpy.ops.object.bake_to_empties(
                        frame_start=context.scene.frame_start,
                        frame_end=context.scene.frame_end,
                        use_scene=True,
                    )

        else:
            bpy.ops.object.mode_set(mode="POSE")
            b_types = {"POSE"}

            for ob in bpy.context.selected_objects:
                if ob.type != "ARMATURE":
                    ob.select_set(False)

            if context.scene.use_preview_range:
                try:
                    bpy.ops.nla.bake(
                        frame_start=context.scene.frame_preview_start,
                        frame_end=context.scene.frame_preview_end,
                        step=1,
                        clear_parents=False,
                        clear_constraints=True,
                        use_current_action=not self.sep_action,
                        only_selected=True,
                        visual_keying=True,
                        clean_curves=True,
                        bake_types=b_types,
                    )
                except:
                    bpy.ops.nla.bake(
                        frame_start=context.scene.frame_preview_start,
                        frame_end=context.scene.frame_preview_end,
                        step=1,
                        clear_parents=False,
                        clear_constraints=True,
                        use_current_action=not self.sep_action,
                        only_selected=True,
                        visual_keying=True,
                        bake_types=b_types,
                    )

            else:
                try:
                    bpy.ops.nla.bake(
                        frame_start=context.scene.frame_start,
                        frame_end=context.scene.frame_end,
                        step=1,
                        clear_parents=False,
                        clear_constraints=True,
                        use_current_action=not self.sep_action,
                        only_selected=True,
                        visual_keying=True,
                        clean_curves=True,
                        bake_types=b_types,
                    )
                except:
                    bpy.ops.nla.bake(
                        frame_start=context.scene.frame_start,
                        frame_end=context.scene.frame_end,
                        step=1,
                        clear_parents=False,
                        clear_constraints=True,
                        use_current_action=not self.sep_action,
                        only_selected=True,
                        visual_keying=True,
                        bake_types=b_types,
                    )

        #

        bpy.ops.object.mode_set(mode="POSE")

        clear_sim_chains(sim_chains)

        for c, c_dat in enumerate(chain_vis):
            rig = c_dat[0]
            if bpy.app.version[0] >= 4:
                for b, bo_coll in enumerate(rig.data.collections):
                    bo_coll.is_visible = c_dat[1][b]
            else:
                for l, layer in enumerate(rig.data.layers):
                    rig.data.layers[l] = c_dat[1][l]

        return {"FINISHED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=800)

    def draw(self, context):
        layout = self.layout

        if is_addon_enabled("goo_anim_utils") or is_addon_enabled("magic_empties"):
            row = layout.row()
            row.prop(self, "use_magic")

        row = layout.row()
        row.prop(self, "sep_action")


#
#
#


_classes = [
    GP_OT_refresh_geonodes_collision,
    GP_OT_add_preset,
    GP_OT_delete_preset,
    GP_OT_apply_preset,
    GP_OT_select_dynamic_bones,
    GP_OT_select_last_dynamic_bone,
    GP_OT_add_geonodes_physics_to_selected,
    GP_OT_add_soft_physics_to_selected,
    GP_OT_add_cloth_physics_to_selected,
    GP_OT_add_jiggle_physics_to_selected,
    GP_OT_sync_frame_range,
    GP_OT_refresh_physics_status,
    GP_OT_remove_physics_from_selected,
    GP_OT_apply_falloff_to_selected,
    GP_OT_add_collider,
    GP_OT_add_wind_object,
    GP_OT_copy_active_wind_controller,
    GP_OT_bake_physics,
]


_register, _unregister = register_classes_factory(_classes)


def register():
    _register()
    return


def unregister():
    _unregister()
    return
