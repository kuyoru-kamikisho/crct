from .functions import *
from bpy.types import AddonPreferences


#
# UPDATE FUNCTIONS
#


def update_bones_prop(self, attr_name, attr_value):
    prefs = bpy.context.preferences.addons["goo_physics"].preferences

    if self.gp_update:
        coll = bpy.data.collections.get("Goo Physics")
        if coll is not None:

            for pb in bpy.context.selected_pose_bones:
                # Dont propagate settings between softbody and cloth if bone has a different setting
                if pb.gp_has_sb_physics == False and bpy.context.active_pose_bone.gp_has_sb_physics:
                    continue

                if pb.gp_has_jg_physics == False and bpy.context.active_pose_bone.gp_has_jg_physics:
                    continue

                if pb.gp_has_cl_physics == False and bpy.context.active_pose_bone.gp_has_cl_physics:
                    continue

                if prefs.apply_to_all_chains == False and pb.gp_chain_id != bpy.context.active_pose_bone.gp_chain_id:
                    continue

                if prefs.apply_to_all_bones == False and pb != bpy.context.active_pose_bone:
                    continue

                pb.gp_update = False

                setattr(pb, attr_name, attr_value)

                ob = coll.objects.get(pb.gp_sim_object)

                if ob is not None and (pb.gp_has_sb_physics or pb.gp_has_cl_physics or pb.gp_has_jg_physics):
                    for mod in ob.modifiers:
                        if mod.type == "SOFT_BODY":
                            if pb.gp_has_sb_physics:
                                mod.settings.goal_spring = pb.gp_sim_stiffness
                                mod.settings.goal_friction = pb.gp_sim_damping
                                mod.settings.goal_min = pb.gp_sim_strength
                                mod.settings.speed = pb.gp_sim_speed
                                mod.settings.friction = pb.gp_sim_friction
                                mod.settings.mass = pb.gp_sim_mass
                                
                            else:
                                mod.settings.goal_spring = pb.gp_sim_stiffness
                                mod.settings.goal_friction = pb.gp_sim_damping
                                mod.settings.speed = pb.gp_sim_speed
                                mod.settings.friction = pb.gp_sim_friction
                                mod.settings.mass = pb.gp_sim_mass

                track_cons = pb.constraints.get("GP_Track")
                if track_cons:
                    track_cons.influence = pb.gp_sim_influence

                follow_cons = pb.constraints.get("GP_Follow")
                if follow_cons:
                    follow_cons.influence = pb.gp_sim_influence

                pb.gp_update = True

    self.gp_update = False
    
    track_cons = self.constraints.get("GP_Track")
    if track_cons:
        track_cons.influence = self.gp_sim_influence

    follow_cons = self.constraints.get("GP_Follow")
    if follow_cons:
        follow_cons.influence = self.gp_sim_influence
    
    self.gp_update = True

    return


def update_bones_speed(self, context):
    update_bones_prop(self, "gp_sim_speed", context.active_pose_bone.gp_sim_speed)
    return


def update_bones_friction(self, context):
    update_bones_prop(self, "gp_sim_friction", context.active_pose_bone.gp_sim_friction)
    return


def update_bones_mass(self, context):
    update_bones_prop(self, "gp_sim_mass", context.active_pose_bone.gp_sim_mass)
    return


def update_bones_stiffness(self, context):
    update_bones_prop(
        self, "gp_sim_stiffness", context.active_pose_bone.gp_sim_stiffness
    )
    return


def update_bones_damping(self, context):
    update_bones_prop(self, "gp_sim_damping", context.active_pose_bone.gp_sim_damping)
    return


def update_bones_strength(self, context):
    update_bones_prop(self, "gp_sim_strength", context.active_pose_bone.gp_sim_strength)
    return


def update_bones_influence(self, context):
    update_bones_prop(
        self, "gp_sim_influence", context.active_pose_bone.gp_sim_influence
    )
    return


def update_bones_air_dampening(self, context):
    update_bones_prop(
        self, "gp_sim_air_dampening", context.active_pose_bone.gp_sim_air_dampening
    )
    return


def update_bones_bend_damping(self, context):
    update_bones_prop(
        self, "gp_sim_bend_damping", context.active_pose_bone.gp_sim_bend_damping
    )
    return


#


def update_chain_prop(self, attr_name, attr_value):
    prefs = bpy.context.preferences.addons["goo_physics"].preferences

    if self.gp_update:
        coll = bpy.data.collections.get("Goo Physics")
        if coll is not None:
            chains, bones = [], []
            for pb in bpy.context.selected_pose_bones:
                if pb.gp_has_gn_physics == False and pb.gp_has_cl_physics == False:
                    continue

                if prefs.apply_to_all_chains == False and pb.gp_chain_id != bpy.context.active_pose_bone.gp_chain_id:
                    continue

                if pb.gp_chain_id not in chains:
                    chains.append(pb.gp_chain_id)
                    bones.append(pb)

            # Loop all bones looking to update rest of chain with changed props
            skip_rigs = []
            for p, pb in enumerate(bones):
                if pb.id_data in skip_rigs:
                    continue
                else:
                    skip_rigs.append(pb.id_data)

                for c_pb in pb.id_data.pose.bones:
                    if c_pb.gp_chain_id in chains:
                        c_pb.gp_update = False

                        setattr(c_pb, attr_name, attr_value)

                        ob = coll.objects.get(c_pb.gp_sim_object)

                        if ob:
                            mod = ob.modifiers.get("GP_Nodes Sim")
                            if mod:
                                inputs = get_inputs_container(mod.node_group)
                                if attr_name == "gp_chain_wind_strength":
                                    mod[inputs["Wind Strength"].identifier] = attr_value
                                if attr_name == "gp_chain_wind_noise_scale":
                                    mod[
                                        inputs["Wind Noise Scale"].identifier
                                    ] = attr_value
                                if attr_name == "gp_chain_wind_noise_strength":
                                    mod[
                                        inputs["Wind Noise Strength"].identifier
                                    ] = attr_value
                                if attr_name == "gp_chain_dampening":
                                    mod[
                                        inputs["Velocity Dampening"].identifier
                                    ] = attr_value
                                if attr_name == "gp_chain_root_falloff":
                                    mod[inputs["Root Pin Size"].identifier] = attr_value
                                if attr_name == "gp_chain_velocity":
                                    mod[
                                        inputs["Velocity Scaler"].identifier
                                    ] = attr_value
                                if attr_name == "gp_chain_gravity":
                                    mod[
                                        inputs["Gravity Strength"].identifier
                                    ] = attr_value
                                if attr_name == "gp_chain_stiffness":
                                    mod[inputs["Goal Strength"].identifier] = attr_value
                                if attr_name == "gp_chain_stiff_end_fac":
                                    mod[
                                        inputs["Goal End Strength"].identifier
                                    ] = attr_value
                                if attr_name == "gp_chain_stiff_vel_fac":
                                    mod[
                                        inputs["Goal Velocity Factor"].identifier
                                    ] = attr_value
                                if attr_name == "gp_chain_stiff_vel_min":
                                    mod[
                                        inputs["Goal Velocity Min"].identifier
                                    ] = attr_value
                                if attr_name == "gp_chain_stiff_vel_max":
                                    mod[
                                        inputs["Goal Velocity Max"].identifier
                                    ] = attr_value
                                if attr_name == "gp_chain_use_collision":
                                    mod[inputs["Use Collision"].identifier] = attr_value
                                if attr_name == "gp_chain_collision_dist":
                                    mod[
                                        inputs["Collision Distance"].identifier
                                    ] = attr_value
                                if attr_name == "gp_chain_collision_friction":
                                    mod[
                                        inputs["Collision Friction"].identifier
                                    ] = attr_value

                                ob.location = ob.location

                            for mod in ob.modifiers:
                                if mod.type == "CLOTH":
                                    mod.settings.mass = pb.gp_chain_mass
                                    mod.settings.time_scale = pb.gp_chain_speed
                                    mod.settings.air_damping = pb.gp_chain_air_dampening
                                    mod.settings.bending_damping = pb.gp_chain_bend_damping
                                    
                        c_pb.gp_update = True

    return


def update_chain_speed(self, context):
    update_chain_prop(self, "gp_chain_speed", context.active_pose_bone.gp_chain_speed)
    return


def update_chain_mass(self, context):
    update_chain_prop(self, "gp_chain_mass", context.active_pose_bone.gp_chain_mass)
    return


def update_chain_air_dampening(self, context):
    update_chain_prop(
        self, "gp_chain_air_dampening", context.active_pose_bone.gp_chain_air_dampening
    )
    return


def update_chain_bend_damping(self, context):
    update_chain_prop(
        self, "gp_chain_bend_damping", context.active_pose_bone.gp_chain_bend_damping
    )
    return


def update_chain_wind_strength(self, context):
    update_chain_prop(
        self, "gp_chain_wind_strength", context.active_pose_bone.gp_chain_wind_strength
    )
    return


def update_chain_wind_noise_scale(self, context):
    update_chain_prop(
        self, "gp_chain_wind_noise_scale", context.active_pose_bone.gp_chain_wind_noise_scale
    )
    return


def update_chain_wind_noise_strength(self, context):
    update_chain_prop(
        self, "gp_chain_wind_noise_strength", context.active_pose_bone.gp_chain_wind_noise_strength
    )
    return


def update_chain_dampening(self, context):
    update_chain_prop(
        self, "gp_chain_dampening", context.active_pose_bone.gp_chain_dampening
    )
    return


def update_chain_root_falloff(self, context):
    update_chain_prop(
        self, "gp_chain_root_falloff", context.active_pose_bone.gp_chain_root_falloff
    )
    return


def update_chain_velocity(self, context):
    update_chain_prop(
        self, "gp_chain_velocity", context.active_pose_bone.gp_chain_velocity
    )
    return


def update_chain_gravity(self, context):
    update_chain_prop(
        self, "gp_chain_gravity", context.active_pose_bone.gp_chain_gravity
    )
    return


def update_chain_stiffness(self, context):
    update_chain_prop(
        self, "gp_chain_stiffness", context.active_pose_bone.gp_chain_stiffness
    )
    return


def update_chain_stiff_end_fac(self, context):
    update_chain_prop(
        self,
        "gp_chain_stiff_end_fac",
        context.active_pose_bone.gp_chain_stiff_end_fac,
    )
    return


def update_chain_velocity_fac(self, context):
    update_chain_prop(
        self, "gp_chain_stiff_vel_fac", context.active_pose_bone.gp_chain_stiff_vel_fac
    )
    return


def update_chain_velocity_min(self, context):
    update_chain_prop(
        self, "gp_chain_stiff_vel_min", context.active_pose_bone.gp_chain_stiff_vel_min
    )
    return


def update_chain_velocity_max(self, context):
    update_chain_prop(
        self, "gp_chain_stiff_vel_max", context.active_pose_bone.gp_chain_stiff_vel_max
    )
    return


def update_chain_use_collision(self, context):
    update_chain_prop(
        self, "gp_chain_use_collision", context.active_pose_bone.gp_chain_use_collision
    )
    return


def update_chain_collision_dist(self, context):
    update_chain_prop(
        self,
        "gp_chain_collision_dist",
        context.active_pose_bone.gp_chain_collision_dist,
    )
    return


def update_chain_friction(self, context):
    update_chain_prop(
        self,
        "gp_chain_collision_friction",
        context.active_pose_bone.gp_chain_collision_friction,
    )
    return


#


#
# PRESETS FUNCTIONS
#


def load_presets(preset_fp):
    
    presets_data = None
    if os.path.exists(preset_fp):
        presets_data = json.load(open(str(preset_fp)))

    items = []
    if presets_data is not None:
        for k in presets_data.keys():
            items.append(
                (
                    k,
                    presets_data[k]["Name"],
                    presets_data[k]["Description"],
                )
            )

    return sorted(items)


def get_cl_presets(self, context):
    preset_fp = Path(os.path.dirname(__file__)) / "presets" / "cloth_presets.json"

    return load_presets(preset_fp)


def get_sb_presets(self, context):
    preset_fp = Path(os.path.dirname(__file__)) / "presets" / "soft_body_presets.json"

    return load_presets(preset_fp)


def get_jg_presets(self, context):
    preset_fp = Path(os.path.dirname(__file__)) / "presets" / "jiggle_spring_presets.json"

    return load_presets(preset_fp)


def get_gn_presets(self, context):
    preset_fp = Path(os.path.dirname(__file__)) / "presets" / "geo_nodes_presets.json"

    return load_presets(preset_fp)


#


class cloth_bone_props(PropertyGroup):
    rig_object: StringProperty(description="")
    rig_bone: StringProperty(description="")


class cloth_bone_collection(PropertyGroup):
    coll: CollectionProperty(type=cloth_bone_props)
    index: IntProperty()


#
# PREFERENCES AND REGISTERS
#


class GooPhysicsPreferences(AddonPreferences):
    bl_idname = "goo_physics"

    gp_divisions: bpy.props.IntProperty(
        default=1,
        min=0,
        max=10,
        name="骨骼分段精度",
        description="为每段骨骼额外添加的顶点数量。增加顶点可以提升细节，并提供更多用于计算碰撞的采样点。",
    )

    gp_physics_type: bpy.props.EnumProperty(
        items=(
            ("GEO_NODES", "几何节点骨骼链", "使用自定义几何节点模拟实现碰撞物理效果"),
            ("SIMP_SOFTBODY", "软体骨骼链", "使用 Blender 内置软体模拟实现骨骼链物理效果"),
            ("CLOTH", "布料骨骼链", "使用 Blender 内置布料模拟实现骨骼链物理效果"),
            ("JIGGLE", "弹性抖动物理", "弹性抖动物理 using builtin Soft Body Simulation"),
        )
    )

    cl_presets: bpy.props.EnumProperty(
        name="布料骨骼链 Presets",
        items=get_cl_presets,
    )

    sb_presets: bpy.props.EnumProperty(
        name="软体骨骼链 Presets",
        items=get_sb_presets,
    )

    sp_presets: bpy.props.EnumProperty(
        name="弹性抖动物理 Presets",
        items=get_jg_presets,
    )

    gn_presets: bpy.props.EnumProperty(
        name="几何节点骨骼链 Presets",
        items=get_gn_presets,
    )

    settings_menu: bpy.props.BoolProperty(
        default=True,
    )
    troubleshoot_menu: bpy.props.BoolProperty(
        default=False,
    )

    chain_menu: bpy.props.BoolProperty(
        default=True,
    )
    bone_menu: bpy.props.BoolProperty(
        default=True,
    )

    cl_time_menu: bpy.props.BoolProperty(
        default=True,
    )
    cl_physical_menu: bpy.props.BoolProperty(
        default=True,
    )
    cl_structure_menu: bpy.props.BoolProperty(
        default=True,
    )

    sb_time_menu: bpy.props.BoolProperty(
        default=True,
    )
    sb_physical_menu: bpy.props.BoolProperty(
        default=True,
    )
    sb_structure_menu: bpy.props.BoolProperty(
        default=True,
    )

    sp_physical_menu: bpy.props.BoolProperty(
        default=True,
    )

    gn_general_menu: bpy.props.BoolProperty(
        default=True,
    )
    gn_stiff_menu: bpy.props.BoolProperty(
        default=True,
    )
    gn_stiff_adv_menu: bpy.props.BoolProperty(
        default=False,
    )
    gn_wind_menu: bpy.props.BoolProperty(
        default=True,
    )
    gn_collision_menu: bpy.props.BoolProperty(
        default=True,
    )

    has_bte: bpy.props.BoolProperty(
        default=False,
    )

    apply_to_all_chains: bpy.props.BoolProperty(
        default=True,
        name="自动更新所有选中的骨骼链",
        description="当前活动骨骼链的物理设置发生变化时，会自动应用到所有选中且物理模式相同的骨骼链。",
    )

    apply_to_all_bones: bpy.props.BoolProperty(
        default=True,
        name="自动更新所有选中的骨骼",
        description="当前活动骨骼的物理设置发生变化时，会自动应用到所有选中且物理模式相同的骨骼。",
    )

    def draw(self, context):
        layout = self.layout
        column = layout.column(align=True)
        row = column.row(align=True)
        row.prop(self, "gp_divisions")
        row = column.row(align=True)
        row.prop(self, "gp_physics_type", text="物理类型")


#
#
#


_classes = [
    GooPhysicsPreferences
]


_register, _unregister = register_classes_factory(_classes)


def register():
    _register()

    bpy.types.PoseBone.gp_chain_wind_strength = FloatProperty(
        default=1.0,
        min=0.0,
        max=100.0,
        description="风力控制器 Z 轴方向上的风力振幅（即箭头所指的方向）。",
        update=update_chain_wind_strength,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_wind_noise_strength = FloatProperty(
        default=0.1,
        min=0.0,
        max=100.0,
        description="风力控制器 X/Y 轴方向上随时间变化的噪声振幅。",
        update=update_chain_wind_noise_strength,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_wind_noise_scale = FloatProperty(
        default=1.0,
        min=-100.0,
        max=100.0,
        description="风力在 X/Y 轴方向上噪声变化的频率或速度。",
        update=update_chain_wind_noise_scale,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_dampening = FloatProperty(
        default=0.1,
        min=0.0,
        max=1.0,
        description="施加于模拟骨骼链上的力的减速程度。",
        update=update_chain_dampening,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_root_falloff = FloatProperty(
        default=0.25,
        min=0.0,
        max=1.0,
        description="0 到 1 之间的系数，用于控制模拟骨骼链根部跟随父级运动的程度。",
        update=update_chain_root_falloff,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_velocity = FloatProperty(
        default=1.0,
        min=0.01,
        max=5.0,
        description="作用于模拟骨骼链的整体物理力缩放系数。",
        update=update_chain_velocity,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_gravity = FloatProperty(
        default=0.02,
        min=0.0,
        max=5.0,
        description="应用于模拟的重力强度。",
        update=update_chain_gravity,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_stiffness = FloatProperty(
        default=0.25,
        min=0.0,
        max=1.0,
        description="模拟骨骼链的刚度，即骨骼链抵抗弯曲的程度。",
        update=update_chain_stiffness,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_stiff_end_fac = FloatProperty(
        default=0.25,
        min=0.0,
        max=1.0,
        description="额外施加于骨骼链末端骨骼的刚度系数，用于增强末端的跟随和重叠运动效果。",
        update=update_chain_stiff_end_fac,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_stiff_vel_fac = FloatProperty(
        default=0.2,
        min=0.0,
        max=1.0,
        description="骨骼链达到最大速度时的刚度缩放系数。数值越低，骨骼链在快速运动时越柔软。",
        update=update_chain_velocity_fac,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_stiff_vel_min = FloatProperty(
        default=0.1,
        min=0.0,
        max=10.0,
        description="开始降低骨骼链刚度时所需的最低运动速度。",
        update=update_chain_velocity_min,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_stiff_vel_max = FloatProperty(
        default=1.0,
        min=0.0,
        max=10.0,
        description="使骨骼链刚度完全降低时对应的最高运动速度。",
        update=update_chain_velocity_max,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_use_collision = BoolProperty(
        default=True,
        description="模拟过程中检测骨骼链与碰撞集合中物体之间的碰撞。",
        update=update_chain_use_collision,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_collision_dist = FloatProperty(
        default=0.01,
        min=0.0,
        max=10.0,
        description="用于检测碰撞的搜索距离。",
        update=update_chain_collision_dist,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_collision_friction = FloatProperty(
        default=0.25,
        min=0.0,
        max=1.0,
        description="骨骼链上的点发生碰撞时，其速度所使用的缩放系数。",
        update=update_chain_friction,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    #

    bpy.types.PoseBone.gp_chain_speed = FloatProperty(
        default=2.0,
        min=0.01,
        max=5.0,
        description="骨骼链模拟的时间缩放比例。",
        update=update_chain_speed,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_mass = FloatProperty(
        default=0.3,
        min=0.0,
        max=50000.0,
        description="模拟骨骼链的质量。",
        update=update_chain_mass,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_air_dampening = FloatProperty(
        default=0.5,
        min=0.0,
        max=10.0,
        description="空气阻尼会在骨骼链向下运动时减缓其物理运动。",
        update=update_chain_air_dampening,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_chain_bend_damping = FloatProperty(
        default=0.5,
        min=0.0,
        max=1000.0,
        description="施加于骨骼链弯曲运动的阻尼量。",
        update=update_chain_bend_damping,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    #

    bpy.types.PoseBone.gp_sim_speed = FloatProperty(
        default=0.8,
        min=0.01,
        max=5.0,
        description="骨骼模拟的时间缩放比例。",
        update=update_bones_speed,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_sim_friction = FloatProperty(
        default=5.0,
        min=0.0,
        max=50.0,
        description="骨骼模拟的摩擦力。",
        update=update_bones_friction,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_sim_mass = FloatProperty(
        default=0.15,
        min=0.0,
        max=50000.0,
        description="模拟骨骼链中骨骼的质量。",
        update=update_bones_mass,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_sim_stiffness = FloatProperty(
        default=0.1,
        min=0.0,
        max=1.0,
        description="模拟过程中，骨骼恢复至初始形状的弹簧刚度。",
        update=update_bones_stiffness,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_sim_damping = FloatProperty(
        default=8.0,
        min=0.0,
        max=50.0,
        description="作用于骨骼初始形状恢复力的阻尼量。",
        update=update_bones_damping,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_sim_strength = FloatProperty(
        default=0.95,
        min=0.0,
        max=1.0,
        description="模拟过程中骨骼保持初始形状的强度。",
        update=update_bones_strength,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_sim_influence = FloatProperty(
        default=1.0,
        min=0.0,
        max=1.0,
        description="0 到 1 之间的影响系数，用于控制骨骼跟随物理模拟的程度。",
        update=update_bones_influence,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_sim_air_dampening = FloatProperty(
        default=1.0,
        min=0.0,
        max=10.0,
        description="空气阻尼会在骨骼向下运动时减缓其物理运动。",
        update=update_bones_air_dampening,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_sim_bend_damping = FloatProperty(
        default=10.0,
        min=0.0,
        max=1000.0,
        description="施加于骨骼链弯曲运动的阻尼量。",
        update=update_bones_bend_damping,
        options={"LIBRARY_EDITABLE", "ANIMATABLE"},
        override={"LIBRARY_OVERRIDABLE"},
    )

    bpy.types.PoseBone.gp_sim_object = StringProperty(
        default="", options={"LIBRARY_EDITABLE"}, override={"LIBRARY_OVERRIDABLE"}
    )

    bpy.types.PoseBone.gp_chain_id = StringProperty(
        default="", options={"LIBRARY_EDITABLE"}, override={"LIBRARY_OVERRIDABLE"}
    )

    bpy.types.PoseBone.gp_has_sb_physics = BoolProperty(
        default=False, options={"LIBRARY_EDITABLE"}, override={"LIBRARY_OVERRIDABLE"}
    )

    bpy.types.PoseBone.gp_has_gn_physics = BoolProperty(
        default=False, options={"LIBRARY_EDITABLE"}, override={"LIBRARY_OVERRIDABLE"}
    )

    bpy.types.PoseBone.gp_has_jg_physics = BoolProperty(
        default=False, options={"LIBRARY_EDITABLE"}, override={"LIBRARY_OVERRIDABLE"}
    )

    bpy.types.PoseBone.gp_has_cl_physics = BoolProperty(
        default=False, options={"LIBRARY_EDITABLE"}, override={"LIBRARY_OVERRIDABLE"}
    )

    bpy.types.PoseBone.gp_update = BoolProperty(default=True)

    bpy.types.PoseBone.gp_end_of_chain = BoolProperty(default=False)

    bpy.utils.register_class(cloth_bone_props)
    bpy.utils.register_class(cloth_bone_collection)
    bpy.types.Object.gp_bone_coll = PointerProperty(type=cloth_bone_collection)


def unregister():
    _unregister()

    bpy.utils.unregister_class(cloth_bone_props)
    bpy.utils.unregister_class(cloth_bone_collection)
    del bpy.types.Object.gp_bone_coll
