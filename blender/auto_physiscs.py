bl_info = {
    "name": "骨骼链阻尼追踪",
    "author": "WANG",
    "version": (5, 2),
    "blender": (3, 0, 0),
    "location": "View3D > 侧边栏(N) > 骨骼链",
    "description": "多组阻尼追踪链(渐变)+ 细分 + 支持新版Wiggle物理与老版限制距离 + 可视化开关",
    "category": "Rigging",
}

import bpy
from bpy.props import (FloatProperty, StringProperty, CollectionProperty,
                       IntProperty, PointerProperty, BoolProperty, EnumProperty)
from bpy.types import (Operator, Panel, PropertyGroup, UIList)
from mathutils import Matrix, Vector


# ===============================================================
# 数据结构
# ===============================================================
class BoneItem(PropertyGroup):
    name: StringProperty(name="骨骼名")


def _get_active_group(context):
    props = context.scene.bonechain_props
    if 0 <= props.group_index < len(props.groups):
        return props.groups[props.group_index]
    return None


def _update_collision(self, context):
    """拖单个碰撞项参数 -> 重建该项的球+胶囊+约束 (仅老版本模式触发)"""
    grp = _find_group_of_collitem(context, self)
    if grp and grp.collision_mode == 'OLD':
        _rebuild_collision_item(context, self)
        _sync_group_collision(context, grp)


def _find_group_of_collitem(context, citem):
    props = context.scene.bonechain_props
    for g in props.groups:
        for c in g.coll_bones:
            if c == citem:
                return g
    return None


class CollisionItem(PropertyGroup):
    name: StringProperty(name="碰撞骨骼名")
    capsule_name: StringProperty()
    ball_group: StringProperty()
    radius: FloatProperty(
        name="粗细", default=0.08, min=0.001, soft_max=1.0,
        update=_update_collision)
    subdiv: IntProperty(
        name="细分", default=3, min=1, max=20,
        update=_update_collision)
    influence: FloatProperty(
        name="强度", default=1.0, min=0.0, max=1.0,
        update=_update_collision)


class ChainGroup(PropertyGroup):
    name: StringProperty(name="组名", default="新分组")
    
    collision_mode: EnumProperty(
        name="碰撞模式",
        items=[
            ('NEW', "新版 (Wiggle物理)", "使用Wiggle2进行物理防穿"),
            ('OLD', "老版 (限制距离)", "使用限制距离约束(胶囊防穿)")
        ],
        default='NEW'
    )
    
    flex_bones: CollectionProperty(type=BoneItem)
    flex_index: IntProperty(default=0)
    coll_bones: CollectionProperty(type=CollisionItem)
    coll_index: IntProperty(default=0)
    
    deform_targets: CollectionProperty(type=CollisionItem)
    deform_index: IntProperty(default=0)
    
    infl_head: FloatProperty(name="头部强度", default=1.0, min=0.0, max=1.0)
    infl_tail: FloatProperty(name="尾部强度", default=1.0, min=0.0, max=1.0)
    
    cyl_radius: FloatProperty(name="圆柱粗细", default=0.09, min=0.005, soft_max=0.5)
    wig_radius: FloatProperty(name="碰撞半径", default=0.03, min=0.001, soft_max=0.3)
    wig_mass: FloatProperty(name="质量", default=0.3, min=0.01, soft_max=5.0)
    wig_stiff: FloatProperty(name="劲度", default=200.0, min=0.0, soft_max=1000.0)
    wig_damp: FloatProperty(name="阻尼", default=3.0, min=0.0, soft_max=20.0)
    wig_stretch: FloatProperty(name="拉伸", default=0.1, min=0.0, max=1.0)
    wig_clean: BoolProperty(
        name="应用前清理冲突约束", default=True,
        description=("移除柔性骨骼上的阻尼追踪和旧限制距离约束。"
                     "Wiggle 会把阻尼追踪当'钉住',与链条互相拉扯导致炸飞"))
    coll_collection_name: StringProperty(default="")


class BoneChainProps(PropertyGroup):
    groups: CollectionProperty(type=ChainGroup)
    group_index: IntProperty(default=0)
    subdiv_count: IntProperty(
        name="细分段数", default=4, min=2, max=32,
        description="把每根选中骨骼切成几段")
    subdiv_weights: BoolProperty(
        name="转移权重", default=True,
        description="把原骨骼顶点组权重按位置分配到新段(实验性)")


# ===============================================================
# 链识别
# ===============================================================
def get_all_chains(bone_names, arm):
    pbones = [arm.pose.bones[n] for n in bone_names if n in arm.pose.bones]
    sel_set = set(b.name for b in pbones)
    heads = [b for b in pbones
             if not (b.parent and b.parent.name in sel_set)]
    if not heads:
        heads = list(pbones)
    chains = []

    def walk(bone, path):
        path = path + [bone]
        children = [c for c in bone.children if c.name in sel_set]
        if not children:
            chains.append(path)
        else:
            for c in children:
                walk(c, path)

    for h in heads:
        walk(h, [])
    return chains


# ===============================================================
# 老版本: 碰撞体 (限制距离)
# ===============================================================
def _clear_item_objects(citem):
    cap = bpy.data.objects.get(citem.capsule_name)
    if cap:
        bpy.data.objects.remove(cap, do_unlink=True)
    if citem.ball_group:
        for obj in list(bpy.data.objects):
            if obj.name.startswith(citem.ball_group):
                bpy.data.objects.remove(obj, do_unlink=True)


def _make_capsule_mesh(name, radius, length):
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=12,
        radius1=radius, radius2=radius, depth=length)
    bmesh.ops.rotate(
        bm, verts=bm.verts, matrix=Matrix.Rotation(1.5708, 3, 'X'))
    bm.to_mesh(me)
    bm.free()
    return me


def _rebuild_collision_item(context, citem):
    arm = context.active_object
    if not arm or arm.type != 'ARMATURE':
        return
    bone_name = citem.name
    if bone_name not in arm.pose.bones:
        return
    pb = arm.pose.bones[bone_name]
    _clear_item_objects(citem)

    length = pb.length
    citem.ball_group = f"碰撞球_{bone_name}_"
    n = citem.subdiv
    for i in range(n):
        t = (i + 0.5) / n
        empty = bpy.data.objects.new(f"{citem.ball_group}{i}", None)
        empty.empty_display_type = 'SPHERE'
        empty.empty_display_size = citem.radius
        empty.show_in_front = True # 强制透视显示
        context.collection.objects.link(empty) # 修改为当前活动集合，防止主集合被隐藏导致看不到
        empty.parent = arm
        empty.parent_type = 'BONE'
        empty.parent_bone = bone_name
        empty.location = (0, -length * (1 - t), 0)

    cap_name = f"碰撞胶囊_{bone_name}"
    me = _make_capsule_mesh(cap_name, citem.radius, length)
    cap = bpy.data.objects.new(cap_name, me)
    cap.display_type = 'WIRE'
    cap.hide_render = True
    cap.show_in_front = True # 强制透视显示
    context.collection.objects.link(cap) # 修改为当前活动集合
    cap.parent = arm
    cap.parent_type = 'BONE'
    cap.parent_bone = bone_name
    cap.location = (0, -length / 2, 0)
    citem.capsule_name = cap.name


def _sync_group_collision(context, grp):
    """把该组柔性骨骼的碰撞约束重建,指向该组所有碰撞球"""
    arm = context.active_object
    if not arm or arm.type != 'ARMATURE':
        return
    prefix = "碰撞_"
    flex_names = [b.name for b in grp.flex_bones]
    for fname in flex_names:
        if fname not in arm.pose.bones:
            continue
        pb = arm.pose.bones[fname]
        for c in [c for c in pb.constraints
                  if c.type == 'LIMIT_DISTANCE' and c.name.startswith(prefix)]:
            pb.constraints.remove(c)
        for citem in grp.coll_bones:
            for i in range(citem.subdiv):
                ball = bpy.data.objects.get(f"{citem.ball_group}{i}")
                if not ball:
                    continue
                con = pb.constraints.new('LIMIT_DISTANCE')
                con.name = f"碰撞_{citem.name}_{i}"
                con.target = ball
                con.limit_mode = 'LIMITDIST_OUTSIDE'
                con.distance = citem.radius
                con.influence = citem.influence


# ===============================================================
# 操作符 - 全局可视化控制
# ===============================================================
class BONECHAIN_OT_toggle_collision_vis(Operator):
    bl_idname = "bonechain.toggle_collision_vis"
    bl_label = "显示/隐藏碰撞体"
    bl_description = "一键切换当前组内所有碰撞球、胶囊和圆柱的可见性"
    
    def execute(self, context):
        grp = _get_active_group(context)
        if not grp: return {'CANCELLED'}
        
        # 获取当前是该隐藏还是显示 (以找到的第一个物体的状态取反)
        is_hidden = False
        first_obj = None
        
        if grp.coll_bones and grp.coll_bones[0].capsule_name:
            first_obj = bpy.data.objects.get(grp.coll_bones[0].capsule_name)
        if not first_obj and grp.deform_targets:
            first_obj = bpy.data.objects.get(f"碰撞柱_{grp.deform_targets[0].name}")
            
        if first_obj:
            is_hidden = not first_obj.hide_get()

        count = 0
        # 切换旧版可见性
        for citem in grp.coll_bones:
            cap = bpy.data.objects.get(citem.capsule_name)
            if cap:
                cap.hide_set(is_hidden)
                cap.show_in_front = True
                count += 1
            if citem.ball_group:
                for obj in list(bpy.data.objects):
                    if obj.name.startswith(citem.ball_group):
                        obj.hide_set(is_hidden)
                        obj.show_in_front = True
                        count += 1
        
        # 切换新版可见性
        for citem in grp.deform_targets:
            cyl = bpy.data.objects.get(f"碰撞柱_{citem.name}")
            if cyl:
                cyl.hide_set(is_hidden)
                cyl.show_in_front = True
                count += 1

        if count == 0:
            self.report({'WARNING'}, "没有找到任何碰撞体，请先生成/应用碰撞")
        else:
            state = "隐藏" if is_hidden else "显示"
            self.report({'INFO'}, f"已{state} {count} 个碰撞体")

        return {'FINISHED'}


# ===============================================================
# 操作符 - 分组
# ===============================================================
class BONECHAIN_OT_group_add(Operator):
    bl_idname = "bonechain.group_add"
    bl_label = "新建分组"

    def execute(self, context):
        props = context.scene.bonechain_props
        g = props.groups.add()
        g.name = f"分组{len(props.groups)}"
        props.group_index = len(props.groups) - 1
        return {'FINISHED'}


class BONECHAIN_OT_group_remove(Operator):
    bl_idname = "bonechain.group_remove"
    bl_label = "删除分组"

    def execute(self, context):
        props = context.scene.bonechain_props
        idx = props.group_index
        if 0 <= idx < len(props.groups):
            for citem in props.groups[idx].coll_bones:
                _clear_item_objects(citem)
            props.groups.remove(idx)
            props.group_index = max(0, idx - 1)
        return {'FINISHED'}


# ===============================================================
# 操作符 - 柔性组
# ===============================================================
class BONECHAIN_OT_add_flex(Operator):
    bl_idname = "bonechain.add_flex"
    bl_label = "添加选中到柔性组"

    def execute(self, context):
        grp = _get_active_group(context)
        if not grp:
            self.report({'ERROR'}, "请先新建/选择分组")
            return {'CANCELLED'}
        sel = context.selected_pose_bones or []
        exist = set(b.name for b in grp.flex_bones)
        added = 0
        for b in sel:
            if b.name not in exist:
                grp.flex_bones.add().name = b.name
                added += 1
        self.report({'INFO'}, f"柔性组添加 {added} 根")
        return {'FINISHED'}


class BONECHAIN_OT_clear_flex(Operator):
    bl_idname = "bonechain.clear_flex"
    bl_label = "清空柔性组"

    def execute(self, context):
        grp = _get_active_group(context)
        if grp:
            grp.flex_bones.clear()
        return {'FINISHED'}


# ===============================================================
# 操作符 - 碰撞组
# ===============================================================
class BONECHAIN_OT_add_coll(Operator):
    bl_idname = "bonechain.add_coll"
    bl_label = "添加选中到碰撞组"

    def execute(self, context):
        grp = _get_active_group(context)
        if not grp:
            self.report({'ERROR'}, "请先新建/选择分组")
            return {'CANCELLED'}
        sel = context.selected_pose_bones or []
        exist = set(b.name for b in grp.coll_bones)
        added = 0
        for b in sel:
            if b.name in exist:
                continue
            it = grp.coll_bones.add()
            it.name = b.name
            if grp.collision_mode == 'OLD':
                _rebuild_collision_item(context, it)
            added += 1
            
        if grp.collision_mode == 'OLD':
            _sync_group_collision(context, grp)
            
        self.report({'INFO'}, f"碰撞组添加 {added} 根")
        return {'FINISHED'}


import re as _re

def _extract_core_side(name):
    n = name
    side = ""
    m = _re.search(r'[._]([lrLR])$', n)
    if m:
        side = m.group(1).lower()
        n = n[:m.start()]
    if n.startswith("c_"):
        n = n[2:]
    for suf in ["_fk", "_ik", "_b", "_nostr", "_cns", "_twist",
                "_stretch", "_master", "_bend"]:
        while n.endswith(suf):
            n = n[:-len(suf)]
    core = n.split("_")[0].split(".")[0].lower()
    return core, side


def _find_deform_by_name(arm, ctrl_name):
    core, side = _extract_core_side(ctrl_name)
    if not core:
        return []
    found = []
    for pb in arm.pose.bones:
        if not arm.data.bones[pb.name].use_deform:
            continue
        c2, s2 = _extract_core_side(pb.name)
        if c2 == core and (side == "" or s2 == side):
            found.append(pb.name)
    return found


class BONECHAIN_OT_resolve_deform(Operator):
    bl_idname = "bonechain.resolve_deform"
    bl_label = "解析变形骨"
    bl_description = ("遍历碰撞组:控制骨→按命名规范找同名变形骨,变形骨→原样加入。"
                     "结果进'变形骨列表',圆柱和 Wiggle 只对该列表操作")

    def execute(self, context):
        grp = _get_active_group(context)
        arm = context.active_object
        if not grp:
            self.report({'ERROR'}, "请先新建/选择分组")
            return {'CANCELLED'}
        if not grp.coll_bones:
            self.report({'ERROR'}, "碰撞组为空,先添加骨骼")
            return {'CANCELLED'}

        for d in grp.deform_targets:
            _clear_item_objects(d)
        grp.deform_targets.clear()

        result = []
        for citem in grp.coll_bones:
            name = citem.name
            db = arm.data.bones.get(name)
            if not db:
                continue
            if db.use_deform:
                if name not in result:
                    result.append(name)
            else:
                for dn in _find_deform_by_name(arm, name):
                    if dn not in result:
                        result.append(dn)

        if not result:
            self.report({'WARNING'},
                        "没解析到变形骨,请检查碰撞组骨骼")
            return {'CANCELLED'}

        for dn in result:
            it = grp.deform_targets.add()
            it.name = dn
            it.radius = grp.cyl_radius

        self.report({'INFO'},
                    f"解析出 {len(result)} 根变形骨,可'生成碰撞圆柱'了")
        return {'FINISHED'}


class BONECHAIN_OT_clear_deform(Operator):
    bl_idname = "bonechain.clear_deform"
    bl_label = "清空变形骨列表"

    def execute(self, context):
        grp = _get_active_group(context)
        if grp:
            for d in grp.deform_targets:
                _clear_item_objects(d)
            grp.deform_targets.clear()
        return {'FINISHED'}


class BONECHAIN_OT_remove_coll(Operator):
    bl_idname = "bonechain.remove_coll"
    bl_label = "移除碰撞项"

    def execute(self, context):
        grp = _get_active_group(context)
        if not grp:
            return {'CANCELLED'}
        idx = grp.coll_index
        if 0 <= idx < len(grp.coll_bones):
            _clear_item_objects(grp.coll_bones[idx])
            grp.coll_bones.remove(idx)
            grp.coll_index = max(0, idx - 1)
            
            if grp.collision_mode == 'OLD':
                _sync_group_collision(context, grp)
        return {'FINISHED'}


class BONECHAIN_OT_clear_coll(Operator):
    bl_idname = "bonechain.clear_coll"
    bl_label = "清空碰撞组"

    def execute(self, context):
        grp = _get_active_group(context)
        if not grp:
            return {'CANCELLED'}
        for citem in grp.coll_bones:
            _clear_item_objects(citem)
        grp.coll_bones.clear()
        
        if grp.collision_mode == 'OLD':
            _sync_group_collision(context, grp)
        return {'FINISHED'}


# ===============================================================
# 操作符 - 阻尼追踪(渐变) / 应用碰撞
# ===============================================================
class BONECHAIN_OT_damped_track(Operator):
    bl_idname = "bonechain.damped_track"
    bl_label = "设置阻尼追踪"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        grp = _get_active_group(context)
        arm = context.active_object
        if not grp:
            self.report({'ERROR'}, "请先选择分组")
            return {'CANCELLED'}
        names = [b.name for b in grp.flex_bones]
        if len(names) < 2:
            self.report({'ERROR'}, "柔性组至少需要 2 根骨骼")
            return {'CANCELLED'}

        chains = get_all_chains(names, arm)
        count = 0
        for chain in chains:
            n_con = len(chain) - 1
            for i in range(n_con):
                bone, target = chain[i], chain[i + 1]
                for c in [c for c in bone.constraints
                          if c.type == 'DAMPED_TRACK']:
                    bone.constraints.remove(c)
                con = bone.constraints.new('DAMPED_TRACK')
                con.target = arm
                con.subtarget = target.name
                t = i / (n_con - 1) if n_con > 1 else 0.0
                con.influence = grp.infl_head + (grp.infl_tail - grp.infl_head) * t
                count += 1
        self.report({'INFO'},
                    f"{len(chains)} 条链,{count} 根骨骼(强度渐变 "
                    f"{grp.infl_head:.2f}→{grp.infl_tail:.2f})")
        return {'FINISHED'}


class BONECHAIN_OT_apply_collision(Operator):
    bl_idname = "bonechain.apply_collision"
    bl_label = "应用碰撞防穿(老版本)"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        grp = _get_active_group(context)
        if not grp:
            return {'CANCELLED'}
        if not grp.flex_bones or not grp.coll_bones:
            self.report({'ERROR'}, "柔性组或碰撞组为空")
            return {'CANCELLED'}
            
        # 强制重建一下，确保对象存在
        for citem in grp.coll_bones:
            _rebuild_collision_item(context, citem)
            
        _sync_group_collision(context, grp)
        self.report({'INFO'}, "已应用老版本限制距离碰撞防穿")
        return {'FINISHED'}


# ===============================================================
# 细分骨骼链(实验性)
# ===============================================================
def _find_skinned_meshes(arm):
    meshes = []
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        for m in obj.modifiers:
            if m.type == 'ARMATURE' and m.object == arm:
                meshes.append(obj)
                break
    return meshes


def _transfer_weights(mesh, arm, orig_name, seg_names, seg_edit_data):
    vg = mesh.vertex_groups.get(orig_name)
    if not vg:
        return
    seg_groups = []
    for sn in seg_names:
        g = mesh.vertex_groups.get(sn) or mesh.vertex_groups.new(name=sn)
        seg_groups.append(g)

    n = len(seg_names)
    root = seg_edit_data[0][0]
    tip = seg_edit_data[-1][1]
    axis = tip - root
    total_len2 = axis.length_squared
    mw = mesh.matrix_world

    vg_idx = vg.index
    for v in mesh.data.vertices:
        w = 0.0
        for g in v.groups:
            if g.group == vg_idx:
                w = g.weight
                break
        if w <= 0.0:
            continue
        co_world = mw @ v.co
        if total_len2 > 1e-9:
            t = (co_world - root).dot(axis) / total_len2
        else:
            t = 0.0
        t = max(0.0, min(1.0, t))
        seg_f = t * n
        idx = int(seg_f)
        if idx >= n:
            idx = n - 1
        seg_groups[idx].add([v.index], w, 'REPLACE')

    mesh.vertex_groups.remove(vg)


class BONECHAIN_OT_subdivide_bones(Operator):
    bl_idname = "bonechain.subdivide_bones"
    bl_label = "细分骨骼链(实验性)"
    bl_options = {'REGISTER', 'UNDO'}

    @classmethod
    def poll(cls, context):
        return (context.active_object
                and context.active_object.type == 'ARMATURE')

    def execute(self, context):
        props = context.scene.bonechain_props
        arm = context.active_object
        n = props.subdiv_count
        do_weights = props.subdiv_weights
        prev_mode = context.mode
        
        if context.mode == 'POSE':
            targets = [b.name for b in (context.selected_pose_bones or [])]
        elif context.mode == 'EDIT_ARMATURE':
            targets = [b.name for b in context.selected_editable_bones
                       if b.select]
        else:
            self.report({'ERROR'}, "请在姿态或编辑模式选中骨骼")
            return {'CANCELLED'}

        if not targets:
            self.report({'ERROR'}, "未选中骨骼")
            return {'CANCELLED'}

        meshes = _find_skinned_meshes(arm) if do_weights else []
        bpy.ops.object.mode_set(mode='EDIT')
        eb = arm.data.edit_bones
        weight_jobs = [] 

        for orig_name in targets:
            bone = eb.get(orig_name)
            if not bone:
                continue
            head = bone.head.copy()
            tail = bone.tail.copy()
            roll = bone.roll
            orig_children = [c for c in bone.children]

            seg_points = [head.lerp(tail, i / n) for i in range(n + 1)]
            seg_names = [orig_name] 
            
            bone.tail = seg_points[1]
            prev = bone
            for i in range(1, n):
                seg = eb.new(f"{orig_name}_seg{i+1}")
                seg.head = seg_points[i]
                seg.tail = seg_points[i + 1]
                seg.roll = roll
                seg.parent = prev
                seg.use_connect = True
                prev = seg
                seg_names.append(seg.name)

            last_seg = prev
            for ch in orig_children:
                ch.parent = last_seg

            mw = arm.matrix_world
            endpoints = []
            for i in range(n):
                h = mw @ seg_points[i]
                t = mw @ seg_points[i + 1]
                endpoints.append((h, t))
            weight_jobs.append((orig_name, seg_names, endpoints))

        bpy.ops.object.mode_set(mode='OBJECT')

        if do_weights:
            for mesh in meshes:
                for (orig_name, seg_names, endpoints) in weight_jobs:
                    _transfer_weights(mesh, arm, orig_name, seg_names, endpoints)

        try:
            if prev_mode == 'POSE':
                bpy.ops.object.mode_set(mode='POSE')
            elif prev_mode.startswith('EDIT'):
                bpy.ops.object.mode_set(mode='EDIT')
        except Exception:
            pass

        self.report({'INFO'},
                    f"{len(weight_jobs)} 根骨骼各细分为 {n} 段"
                    + ("(已转权重)" if do_weights else ""))
        return {'FINISHED'}


# ===============================================================
# Wiggle 2 (RTX Edition) 物理防穿
# ===============================================================
def _wiggle_available(context):
    b = context.active_pose_bone
    if b and hasattr(b, "wiggle") and hasattr(b.wiggle, "tail"):
        return True
    return hasattr(context.scene, "wiggle") and hasattr(context.scene.wiggle, "enable")


def _make_cylinder(context, arm, bone_name, radius):
    pb = arm.pose.bones.get(bone_name)
    if not pb:
        return None
    head = arm.matrix_world @ pb.head
    tail = arm.matrix_world @ pb.tail
    length = (tail - head).length
    mid = (head + tail) / 2

    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=length, location=mid)
    cyl = context.active_object
    cyl.name = f"碰撞柱_{bone_name}"
    cyl.display_type = 'WIRE'
    cyl.hide_render = True
    cyl.show_in_front = True # 强制透视显示

    direction = (tail - head).normalized()
    cyl.rotation_mode = 'QUATERNION'
    cyl.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction)

    cyl.parent = arm
    cyl.parent_type = 'BONE'
    cyl.parent_bone = bone_name
    cyl.matrix_world.translation = mid
    return cyl


def _get_group_collection(grp):
    name = grp.coll_collection_name or f"碰撞体_{grp.name}"
    coll = bpy.data.collections.get(name)
    if not coll:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    grp.coll_collection_name = coll.name
    return coll


class BONECHAIN_OT_gen_cylinders(Operator):
    bl_idname = "bonechain.gen_cylinders"
    bl_label = "生成碰撞圆柱"
    bl_options = {'REGISTER', 'UNDO'}
    bl_description = "为变形骨列表每根骨骼生成对齐圆柱,放进该组碰撞集合"

    def execute(self, context):
        grp = _get_active_group(context)
        arm = context.active_object
        if not grp or not grp.deform_targets:
            self.report({'ERROR'}, "变形骨列表为空,先点'解析变形骨'")
            return {'CANCELLED'}

        coll = _get_group_collection(grp)
        made = 0
        for citem in grp.deform_targets:
            old = bpy.data.objects.get(f"碰撞柱_{citem.name}")
            if old:
                bpy.data.objects.remove(old, do_unlink=True)
            cyl = _make_cylinder(context, arm, citem.name, grp.cyl_radius)
            if cyl:
                for uc in list(cyl.users_collection):
                    uc.objects.unlink(cyl)
                coll.objects.link(cyl)
                made += 1
                
        context.view_layer.objects.active = arm
        self.report({'INFO'}, f"生成 {made} 个圆柱到集合「{coll.name}」")
        return {'FINISHED'}


class BONECHAIN_OT_apply_wiggle(Operator):
    bl_idname = "bonechain.apply_wiggle"
    bl_label = "应用Wiggle防穿"
    bl_options = {'REGISTER', 'UNDO'}
    bl_description = "把柔性骨骼配成 Wiggle 摆动骨,碰撞该组圆柱集合(真物理防穿)"

    def execute(self, context):
        grp = _get_active_group(context)
        arm = context.active_object
        scene = context.scene

        if not _wiggle_available(context):
            self.report({'ERROR'}, "未检测到 Wiggle 2,请先安装并启用")
            return {'CANCELLED'}
        if not grp or not grp.flex_bones:
            self.report({'ERROR'}, "柔性组为空")
            return {'CANCELLED'}

        coll = bpy.data.collections.get(grp.coll_collection_name)
        if not coll or not list(coll.objects):
            self.report({'ERROR'}, "没有碰撞圆柱,请先点'生成碰撞圆柱'")
            return {'CANCELLED'}

        scene.wiggle.enable = True
        arm.wiggle.enable = True

        cleaned = 0
        if grp.wig_clean:
            for item in grp.flex_bones:
                pb = arm.pose.bones.get(item.name)
                if not pb:
                    continue
                for c in list(pb.constraints):
                    if c.type == 'DAMPED_TRACK':
                        pb.constraints.remove(c)
                        cleaned += 1
                    elif (c.type == 'LIMIT_DISTANCE'
                          and c.name.startswith("碰撞_")):
                        pb.constraints.remove(c)
                        cleaned += 1

        ok = 0
        for item in grp.flex_bones:
            pb = arm.pose.bones.get(item.name)
            if not pb:
                continue
            w = pb.wiggle
            w.tail = True
            w.collider_type = 'Collection'
            w.collider_collection = coll
            w.radius = grp.wig_radius
            w.chain = True
            w.mass = grp.wig_mass
            w.stiff = grp.wig_stiff
            w.damp = grp.wig_damp
            w.stretch = grp.wig_stretch
            ok += 1

        self.report({'INFO'},
                    f"{ok} 根柔性骨骼已配 Wiggle,碰撞 {len(list(coll.objects))} 个圆柱"
                    + (f",清理 {cleaned} 个冲突约束" if cleaned else "")
                    + "。按'重置'再播放")
        return {'FINISHED'}


class BONECHAIN_OT_wiggle_reset(Operator):
    bl_idname = "bonechain.wiggle_reset"
    bl_label = "重置Wiggle物理"
    bl_description = "调用 Wiggle 的重置(回到静止,消除抖动)"

    def execute(self, context):
        if hasattr(bpy.ops.wiggle, "reset"):
            try:
                bpy.ops.wiggle.reset()
            except Exception as e:
                self.report({'WARNING'}, f"重置失败: {e}")
                return {'CANCELLED'}
        self.report({'INFO'}, "已重置 Wiggle 物理")
        return {'FINISHED'}


class BONECHAIN_OT_wiggle_bake(Operator):
    bl_idname = "bonechain.wiggle_bake"
    bl_label = "烘焙Wiggle到关键帧"
    bl_description = "调用 Wiggle 烘焙,把物理转成关键帧(导出/渲染前用)"

    def execute(self, context):
        if hasattr(bpy.ops.wiggle, "bake"):
            try:
                bpy.ops.wiggle.bake()
            except Exception as e:
                self.report({'WARNING'}, f"烘焙失败: {e}")
                return {'CANCELLED'}
        self.report({'INFO'}, "已烘焙 Wiggle 到关键帧")
        return {'FINISHED'}


# ===============================================================
# UIList
# ===============================================================
class BONECHAIN_UL_groups(UIList):
    def draw_item(self, ctx, layout, data, item, icon, active_data, prop):
        layout.prop(item, "name", text="", emboss=False, icon='GROUP_BONE')


class BONECHAIN_UL_flex(UIList):
    def draw_item(self, ctx, layout, data, item, icon, active_data, prop):
        layout.label(text=item.name, icon='BONE_DATA')


class BONECHAIN_UL_coll(UIList):
    def draw_item(self, ctx, layout, data, item, icon, active_data, prop):
        props = ctx.scene.bonechain_props
        if not props.groups or props.group_index < 0 or props.group_index >= len(props.groups):
            return
        
        grp = props.groups[props.group_index]
        
        if grp.collision_mode == 'OLD':
            col = layout.column(align=True)
            col.label(text=item.name, icon='META_CAPSULE')
            row = col.row(align=True)
            row.prop(item, "radius", text="粗")
            row.prop(item, "subdiv", text="细分")
            row.prop(item, "influence", text="强度")
        else:
            arm = ctx.active_object
            tag = ""
            if arm and arm.type == 'ARMATURE':
                db = arm.data.bones.get(item.name)
                if db:
                    tag = "  [变形骨]" if db.use_deform else "  [控制骨]"
            layout.label(text=item.name + tag, icon='BONE_DATA')


class BONECHAIN_UL_deform(UIList):
    def draw_item(self, ctx, layout, data, item, icon, active_data, prop):
        layout.label(text=item.name, icon='MESH_CYLINDER')


# ===============================================================
# 面板
# ===============================================================
class BONECHAIN_PT_panel(Panel):
    bl_label = "骨骼链阻尼追踪"
    bl_idname = "BONECHAIN_PT_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "骨骼链"

    def draw(self, context):
        layout = self.layout
        obj = context.active_object
        if not (obj and obj.type == 'ARMATURE' and context.mode == 'POSE'):
            layout.label(text="请在姿态模式下操作", icon='INFO')
            return
        props = context.scene.bonechain_props

        # 分组列表
        box = layout.box()
        box.label(text="分组(头发/裙子/飘带…)", icon='GROUP_BONE')
        row = box.row()
        row.template_list("BONECHAIN_UL_groups", "", props, "groups",
                          props, "group_index", rows=3)
        col = row.column(align=True)
        col.operator("bonechain.group_add", text="", icon='ADD')
        col.operator("bonechain.group_remove", text="", icon='REMOVE')

        # 细分骨骼(实验性)
        box = layout.box()
        box.label(text="细分骨骼链(实验性)", icon='MOD_SUBSURF')
        box.label(text="⚠ 不保证稳定,先备份文件", icon='ERROR')
        row = box.row(align=True)
        row.prop(props, "subdiv_count", text="段数")
        box.prop(props, "subdiv_weights")
        box.operator("bonechain.subdivide_bones", text="细分选中骨骼", icon='MOD_SUBSURF')

        grp = _get_active_group(context)
        if not grp:
            layout.label(text="请新建一个分组开始", icon='INFO')
            return

        # 柔性组
        box = layout.box()
        box.label(text="柔性骨骼组", icon='CON_TRACKTO')
        box.template_list("BONECHAIN_UL_flex", "", grp, "flex_bones",
                          grp, "flex_index", rows=3)
        row = box.row(align=True)
        row.operator("bonechain.add_flex", text="添加选中", icon='ADD')
        row.operator("bonechain.clear_flex", text="清空", icon='TRASH')
        row = box.row(align=True)
        row.prop(grp, "infl_head", text="头部(根)")
        row.prop(grp, "infl_tail", text="尾部(梢)")
        box.label(text="强度沿链从头到尾渐变", icon='INFO')
        box.operator("bonechain.damped_track", text="① 设置阻尼追踪",
                     icon='CON_TRACKTO')

        # ============ 碰撞设置 (按组切换) ============
        box = layout.box()
        row = box.row()
        row.label(text="碰撞设置", icon='META_CAPSULE')
        # 一键显示隐藏按钮
        row.operator("bonechain.toggle_collision_vis", text="", icon='HIDE_OFF')
        
        box.prop(grp, "collision_mode", expand=True) # 切换按钮

        if grp.collision_mode == 'NEW':
            # Wiggle 物理模式 UI
            cbox = box.box()
            cbox.label(text="碰撞骨骼组 (控制源)", icon='BONE_DATA')
            cbox.template_list("BONECHAIN_UL_coll", "", grp, "coll_bones",
                              grp, "coll_index", rows=3)
            row = cbox.row(align=True)
            row.operator("bonechain.add_coll", text="添加选中", icon='ADD')
            row.operator("bonechain.remove_coll", text="移除", icon='REMOVE')
            row.operator("bonechain.clear_coll", text="清空", icon='TRASH')

            dbox = box.box()
            dbox.label(text="变形骨列表(圆柱目标)", icon='BONE_DATA')
            dbox.operator("bonechain.resolve_deform",
                          text="解析变形骨(控制骨→找变形骨)", icon='ZOOM_SELECTED')
            dbox.template_list("BONECHAIN_UL_deform", "", grp, "deform_targets",
                               grp, "deform_index", rows=3)
            dbox.operator("bonechain.clear_deform", text="清空变形骨", icon='TRASH')

            wbox = box.box()
            wbox.label(text="物理防穿 (Wiggle 2)", icon='PHYSICS')
            if not _wiggle_available(context):
                wbox.label(text="⚠ 未检测到 Wiggle 2,请先安装", icon='ERROR')
            wbox.prop(grp, "cyl_radius")
            wbox.operator("bonechain.gen_cylinders", text="① 生成碰撞圆柱", icon='MESH_CYLINDER')
            
            col = wbox.column(align=True)
            col.prop(grp, "wig_radius")
            col.prop(grp, "wig_mass")
            col.prop(grp, "wig_stiff")
            col.prop(grp, "wig_damp")
            col.prop(grp, "wig_stretch")
            wbox.prop(grp, "wig_clean")
            wbox.label(text="⚠ 阻尼追踪与Wiggle冲突,会被清理", icon='ERROR')
            wbox.operator("bonechain.apply_wiggle", text="② 应用Wiggle防穿", icon='FORCE_TURBULENCE')
            
            row = wbox.row(align=True)
            row.operator("bonechain.wiggle_reset", text="重置", icon='FILE_REFRESH')
            row.operator("bonechain.wiggle_bake", text="烘焙", icon='RENDER_ANIMATION')
            wbox.label(text="配好后按播放键预览摆动+防穿", icon='INFO')
            
        else:
            # 限制距离约束 (老版本) UI
            cbox = box.box()
            cbox.label(text="碰撞骨骼组 (胶囊/球)", icon='META_CAPSULE')
            cbox.template_list("BONECHAIN_UL_coll", "", grp, "coll_bones",
                              grp, "coll_index", rows=4)
            row = cbox.row(align=True)
            row.operator("bonechain.add_coll", text="添加选中", icon='ADD')
            row.operator("bonechain.remove_coll", text="移除", icon='REMOVE')
            row.operator("bonechain.clear_coll", text="清空", icon='TRASH')

            lbox = box.box()
            lbox.label(text="限制距离防穿(非物理)", icon='CON_DISTLIMIT')
            lbox.label(text="粗=半径 细分=球数 强度=逐骨骼调", icon='INFO')
            lbox.operator("bonechain.apply_collision", text="② 应用老版防穿", icon='CON_DISTLIMIT')


# ===============================================================
classes = (
    BoneItem, CollisionItem, ChainGroup, BoneChainProps,
    BONECHAIN_OT_toggle_collision_vis,  # 新增的可见性开关算子
    BONECHAIN_OT_group_add, BONECHAIN_OT_group_remove,
    BONECHAIN_OT_add_flex, BONECHAIN_OT_clear_flex,
    BONECHAIN_OT_add_coll, BONECHAIN_OT_resolve_deform,
    BONECHAIN_OT_clear_deform,
    BONECHAIN_OT_remove_coll, BONECHAIN_OT_clear_coll,
    BONECHAIN_OT_damped_track, BONECHAIN_OT_apply_collision,
    BONECHAIN_OT_subdivide_bones,
    BONECHAIN_OT_gen_cylinders, BONECHAIN_OT_apply_wiggle,
    BONECHAIN_OT_wiggle_reset, BONECHAIN_OT_wiggle_bake,
    BONECHAIN_UL_groups, BONECHAIN_UL_flex, BONECHAIN_UL_coll,
    BONECHAIN_UL_deform,
    BONECHAIN_PT_panel,
)


def register():
    for c in classes:
        bpy.utils.register_class(c)
    bpy.types.Scene.bonechain_props = PointerProperty(type=BoneChainProps)


def unregister():
    del bpy.types.Scene.bonechain_props
    for c in reversed(classes):
        bpy.utils.unregister_class(c)


if __name__ == "__main__":
    register()