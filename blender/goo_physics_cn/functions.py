
from bpy.types import Panel, Menu, Operator, PropertyGroup
from bpy.props import *
from bpy.utils import register_classes_factory
from bl_operators.presets import AddPresetBase
import bpy
import os
from mathutils import Vector
import shutil
from pathlib import Path
import random
import addon_utils
import json
import numpy as np


#
# FUNCTIONS
#


def create_collider_object(
    objects, ob_name, collide_coll, combine_ob_ng, convex_hull=True
):
    mesh_dat = bpy.data.meshes.new(ob_name)

    mesh_dat.from_pydata([], [], [])
    mesh_dat.update()

    collider_object = bpy.data.objects.new(ob_name, mesh_dat)
    collide_coll.objects.link(collider_object)

    collider_object.lock_location = [True, True, True]
    collider_object.lock_scale = [True, True, True]
    collider_object.lock_rotation = [True, True, True]
    collider_object.hide_render = True
    # collider_object.hide_viewport = True

    mod = collider_object.modifiers.new("GP_Nodes Combine Objects", "NODES")
    mod.node_group = combine_ob_ng
    num = 0
    for ob in objects:
        inputs = get_inputs_container(mod.node_group)
        mod[inputs["Object " + str((num % 20) + 1)].identifier] = ob
        num += 1

        if (num % 20) == 0:
            mod = collider_object.modifiers.new("GP_Nodes Combine Objects", "NODES")
            mod.node_group = combine_ob_ng

    mod[inputs["Convex Hull"].identifier] = convex_hull

    return collider_object


def create_sb_simple_mesh(name, b_len):
    verts = [[0.0, 0.0, 0.0], [0.0, b_len, 0.0]]
    edges = [[0, 1]]

    mesh_dat = bpy.data.meshes.new(name)

    mesh_dat.from_pydata(verts, edges, [])

    mesh_dat.update()

    ob = bpy.data.objects.new(name, mesh_dat)

    vg = ob.vertex_groups.new(name="Head")
    vg.add([0], 1.0, "REPLACE")
    vg = ob.vertex_groups.new(name="Tail")
    vg.add([1], 1.0, "REPLACE")

    return ob


def create_jg_simple_mesh(name, b_len):
    verts = [[0.0, 0.0, 0.0], [0.0, b_len, 0.0]]
    edges = [[0, 1]]

    mesh_dat = bpy.data.meshes.new(name)

    mesh_dat.from_pydata(verts, edges, [])

    mesh_dat.update()

    ob = bpy.data.objects.new(name, mesh_dat)

    vg = ob.vertex_groups.new(name="Head")
    vg.add([0], 1.0, "REPLACE")

    vg = ob.vertex_groups.new(name="Goal")
    vg.add([0, 1], 1.0, "REPLACE")

    return ob


def create_sb_coll_mesh(name, thickness, b_len, segments):
    verts = []
    faces = [[0, 1, 2, 3]]

    for i in range(segments):
        len_size = b_len * (i / (segments - 1))

        seg_ind = i * 4

        for ii in range(4):
            x_val = -thickness if ii in [1, 2] else thickness
            z_val = -thickness if ii in [2, 3] else thickness
            verts.append([x_val, len_size, z_val])

            if i < segments - 1:
                if ii == 3:
                    faces.append(
                        [
                            seg_ind,
                            seg_ind + ii,
                            seg_ind + 4 + ii,
                            seg_ind + 4,
                        ]
                    )
                else:
                    faces.append(
                        [
                            seg_ind + 1 + ii,
                            seg_ind + ii,
                            seg_ind + 4 + ii,
                            seg_ind + 5 + ii,
                        ]
                    )

    faces.append([len(verts) - 1, len(verts) - 2, len(verts) - 3, len(verts) - 4])

    mesh_dat = bpy.data.meshes.new(name)

    mesh_dat.from_pydata(verts, [], faces)

    mesh_dat.update()

    ob = bpy.data.objects.new(name, mesh_dat)

    vg = ob.vertex_groups.new(name="Head")
    vg.add(faces[0], 1.0, "REPLACE")
    vg = ob.vertex_groups.new(name="Tail")
    vg.add(faces[-1], 1.0, "REPLACE")

    return ob


def get_bone_chains(bones):
    chain_roots, skip_bones = [], []
    for pb in bones:
        if pb.parent is None:
            continue

        # If parent not selected this bone is the start of a chain
        if bpy.app.version[0] >= 5:
            chain_root = pb.parent.select == False or pb.parent.bone.parent is None
        else:
            chain_root = pb.parent.bone.select == False or pb.parent.bone.parent is None

        if chain_root:
            chain_roots.append([pb.id_data, pb.name])
            skip_bones.append(pb.id_data.name + "_" + pb.name)

        else:
            if bpy.app.version[0] >= 5:
                sel_children = [pc for pc in pb.children if pc.select]
            else:
                sel_children = [pc for pc in pb.children if pc.bone.select]

            if len(sel_children) > 1:
                for cpb in sel_children:
                    chain_roots.append([cpb.id_data, cpb.name])
                    skip_bones.append(cpb.id_data.name + "_" + cpb.name)

    chains = []
    for pb_dat in chain_roots:
        pb = pb_dat[0].pose.bones[pb_dat[1]]
        chain = [pb_dat]

        for cpb in pb.children_recursive:
            if cpb.id_data.name + "_" + cpb.name in skip_bones:
                chains.append(chain[::-1])
                break
            
            if bpy.app.version[0] >= 5:
                child_sel = cpb.select
            else:
                child_sel = cpb.bone.select
            
            if child_sel:
                chain.append([cpb.id_data, cpb.name])
            else:
                chains.append(chain[::-1])
                break
            
            if cpb.child is None:
                chains.append(chain[::-1])
                break

    return chains


def clear_sim_chains(bone_chains):

    for chain in bone_chains:
        for b, bo_dat in enumerate(chain):
            rig = bo_dat[0]
            pb = rig.pose.bones[bo_dat[1]]

            track_cons = pb.constraints.get("GP_Track")
            if track_cons:
                pb.constraints.remove(track_cons)
            
            follow_cons = pb.constraints.get("GP_Follow")
            if follow_cons:
                pb.constraints.remove(follow_cons)

            ob = bpy.data.objects.get(pb.gp_sim_object)
            if ob:
                try:
                    mod = ob.modifiers.get("GP_Nodes Sim")
                    if mod:
                        inputs = get_inputs_container(mod.node_group)
                        bpy.data.objects.remove(mod[inputs["Root Ref Object"].identifier])
                except:
                    pass
                bpy.data.objects.remove(ob)

            pb.gp_has_sb_physics = False
            pb.gp_has_cl_physics = False
            pb.gp_has_gn_physics = False
            pb.gp_has_jg_physics = False
            pb.gp_end_of_chain = False
            pb.gp_chain_id = ""
            pb.gp_sim_object = ""

    return


def get_partial_selected_bone_chains(bones, geo_nodes_only=False, only_active=False):
    chains, skip_bones = [], []
    for pb in bones:
        if pb.name in skip_bones:
            continue

        if only_active and bpy.context.active_pose_bone.gp_chain_id != pb.gp_chain_id:
            continue

        track_cons = pb.constraints.get("GP_Track")
        follow_cons = pb.constraints.get("GP_Follow")
        if follow_cons and pb.gp_has_jg_physics:
            chain = [[pb.id_data, pb.name]]
            
            skip_bones += [c[1] for c in chain]
            chains.append(chain)

        elif track_cons and (geo_nodes_only == False or pb.gp_has_gn_physics):
            chain = [[pb.id_data, pb.name]]

            for par in pb.parent_recursive:
                if par.constraints.get("GP_Track"):
                    chain.insert(0, [par.id_data, par.name])

                    if par.gp_end_of_chain:
                        break

                else:
                    break
            searching = True
            search_pb = pb
            while searching:
                search_len = len(chain)
                for child in search_pb.children:
                    if child.constraints.get("GP_Track"):
                        if child.gp_end_of_chain == False:
                            chain.append([child.id_data, child.name])
                            search_pb = child
                            break

                    else:
                        break

                searching = len(chain) != search_len

            skip_bones += [c[1] for c in chain]
            chains.append(chain)

    return chains


def create_geonodes_chains(chains, coll, collide_coll, divisions):
    link_fp = Path(os.path.dirname(__file__)) / "gp_sim_nodes_tree.blend"

    # Link in geo nodes node groups
    simulation_ng = bpy.data.node_groups.get("GooPhysics_SimulationProcess")
    if simulation_ng is None:
        with bpy.data.libraries.load(
            str(link_fp), relative=True
        ) as (data_from, data_to):
            data_to.node_groups = [
                nt
                for nt in data_from.node_groups
                if nt in ["GooPhysics_SimulationProcess"]
            ]

        simulation_ng = data_to.node_groups[0]

    coll_ob_ng = bpy.data.node_groups.get("GooPhysics_CollisionCreate")
    if coll_ob_ng is None:
        with bpy.data.libraries.load(
            str(link_fp), relative=True
        ) as (data_from, data_to):
            data_to.node_groups = [
                nt
                for nt in data_from.node_groups
                if nt in ["GooPhysics_CollisionCreate"]
            ]

        coll_ob_ng = data_to.node_groups[0]

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

    #

    chain_obs = []
    for c, chain in enumerate(chains):
        next_num = c
        for ob in coll.objects:
            try:
                cur_num = int(
                    ob.name.replace("GP_GeoNodes_Chain_Root_Ref_", "")
                    .replace("GP_GeoNodes_Chain_", "")
                    .split("_")[0]
                )

                if next_num < cur_num:
                    next_num = cur_num
            except:
                pass

        num = "%02d" % (next_num + 1)
        verts, edges = [], []
        for cc, c_dat in enumerate(chain[::-1]):
            rig = c_dat[0]
            bone = rig.pose.bones[c_dat[1]]

            bone.gp_has_gn_physics = True
            bone.gp_chain_id = num

            head_co = rig.matrix_world @ bone.head
            tail_co = rig.matrix_world @ bone.tail

            vec = tail_co - head_co

            if cc == 0:
                verts.append(head_co)

            for i in range(divisions):
                fac = (i + 1) / (divisions + 1)
                verts.append(head_co + vec * fac)
                edges.append([len(verts) - 2, len(verts) - 1])

            verts.append(tail_co)
            edges.append([len(verts) - 2, len(verts) - 1])

            bone.gp_end_of_chain = cc == 0

        #

        rig = chain[-1][0]
        bone = rig.pose.bones[chain[-1][1]]

        chain_name = "GP_GeoNodes_Chain_" + num
        mesh_dat = bpy.data.meshes.new(chain_name)

        mesh_dat.from_pydata(verts, edges, [])
        mesh_dat.update()

        chain_ob = bpy.data.objects.new(chain_name, mesh_dat)
        coll.objects.link(chain_ob)

        chain_root_ref = bpy.data.objects.new(
            chain_name.replace("_Chain_", "_Chain_Root_Ref_"), None
        )
        coll.objects.link(chain_root_ref)
        chain_root_ref.empty_display_size = 0.025
        chain_root_ref.empty_display_type = "CUBE"

        for cc, c_dat in enumerate(chain[::-1]):
            rig = c_dat[0]
            bone = rig.pose.bones[c_dat[1]]

            c_ob = chain_ob.gp_bone_coll.coll.add()
            c_ob.rig_object = rig.name
            c_ob.rig_bone = c_dat[1]

        chain_ob.lock_location = [True, True, True]
        chain_ob.lock_scale = [True, True, True]
        chain_ob.lock_rotation = [True, True, True]

        mod = chain_ob.modifiers.new("GP_Nodes Sim", "NODES")
        mod.node_group = simulation_ng
        inputs = get_inputs_container(mod.node_group)
        mod[inputs["Root Ref Object"].identifier] = chain_root_ref

        mod[inputs["Seed"].identifier] = random.randint(-5000, 5000)
        
        mod[inputs["Collision Collection"].identifier] = collide_coll

        mod[inputs["Use Collision"].identifier] = True
        
        #

        for cc, c_dat in enumerate(chain[::-1]):
            rig = c_dat[0]
            bone = rig.pose.bones[c_dat[1]]

            if cc == 0:
                
                mod[inputs["Velocity Scaler"].identifier] = bone.gp_chain_velocity
                mod[inputs["Velocity Dampening"].identifier] = bone.gp_chain_dampening
                mod[inputs["Gravity Strength"].identifier] = bone.gp_chain_gravity
                mod[inputs["Root Pin Size"].identifier] = bone.gp_chain_root_falloff
                mod[inputs["Goal Strength"].identifier] = bone.gp_chain_stiffness
                mod[inputs["Goal End Strength"].identifier] = bone.gp_chain_stiff_end_fac
                mod[inputs["Goal Velocity Factor"].identifier] = bone.gp_chain_stiff_vel_fac
                mod[inputs["Goal Velocity Min"].identifier] = bone.gp_chain_stiff_vel_min
                mod[inputs["Goal Velocity Max"].identifier] = bone.gp_chain_stiff_vel_max
                mod[inputs["Wind Strength"].identifier] = bone.gp_chain_wind_strength
                mod[inputs["Wind Noise Strength"].identifier] = bone.gp_chain_wind_noise_strength
                mod[inputs["Wind Noise Scale"].identifier] = bone.gp_chain_wind_noise_scale
                mod[inputs["Collision Distance"].identifier] = bone.gp_chain_collision_dist
                mod[inputs["Collision Friction"].identifier] = bone.gp_chain_collision_friction


                # chain_root_ref.parent = rig
                # chain_root_ref.parent_type = "BONE"
                # chain_root_ref.parent_bone = bone.parent.name

                # chain_root_ref.matrix_world = rig.matrix_world @ bone.parent.matrix

                # chain_root_ref.location = chain_root_ref.matrix_world.inverted() @ (
                #     rig.matrix_world @ bone.head
                # )
                # chain_root_ref.location[1] -= bone.parent.length
                # chain_root_ref.scale = [1.0, 1.0, 1.0]
                # chain_root_ref.rotation_euler = [0.0, 0.0, 0.0]

                chain_root_ref.lock_location = [True, True, True]
                chain_root_ref.lock_rotation = [True, True, True]
                chain_root_ref.lock_scale = [True, True, True]

                chain_root_ref.location = rig.matrix_world @ bone.head
                
                con = chain_root_ref.constraints.new("CHILD_OF")
                con.target = rig
                con.subtarget = bone.parent.name

                # con = chain_root_ref.constraints.new("COPY_TRANSFORMS")
                # con.target = rig
                # con.subtarget = bone.name

                vg = chain_ob.vertex_groups.new(name="Root")
                vg.add([0], 1.0, "REPLACE")

            vg_name = "Bone_" + str(cc + 1)
            vg = chain_ob.vertex_groups.new(name=vg_name)
            vg.add([cc + divisions * (cc + 1) + 1], 1.0, "REPLACE")

            bone.gp_sim_object = chain_ob.name

            con = bone.constraints.new("DAMPED_TRACK")
            con.name = "GP_Track"
            con.target = chain_ob
            con.subtarget = vg_name
            # con.influence = 1.0
            con.influence = bone.gp_sim_influence

        chain_obs.append(chain_ob)

    return chain_obs


def create_soft_chains(chains, coll):

    chain_sets = []
    for c, chain in enumerate(chains):
        next_num = c
        for ob in coll.objects:
            try:
                cur_num = int(
                    ob.name.replace("GP_SoftBody_Chain_Root_Ref_", "")
                    .replace("GP_SoftBody_Chain_", "")
                    .split("_")[0]
                )

                if next_num < cur_num:
                    next_num = cur_num
            except:
                pass

        num = "%02d" % (next_num + 1)

        chain_obs = []
        for cc, c_dat in enumerate(chain[::-1]):
            b_ind = "%02d" % (cc + 1)

            rig = c_dat[0]
            bone = rig.pose.bones[c_dat[1]]

            bone.gp_has_sb_physics = True
            bone.gp_chain_id = num

            chain_name = "GP_SoftBody_Chain_" + num + "_" + b_ind

            chain_ob = create_sb_simple_mesh(
                chain_name,
                bone.length,
            )

            coll.objects.link(chain_ob)

            bone.gp_end_of_chain = cc == 0
            bone.gp_sim_object = chain_ob.name

            c_ob = chain_ob.gp_bone_coll.coll.add()
            c_ob.rig_object = c_dat[0].name
            c_ob.rig_bone = c_dat[1]

            chain_obs.append(chain_ob)

            con = bone.constraints.new("DAMPED_TRACK")
            con.name = "GP_Track"
            con.target = chain_ob
            con.subtarget = "Tail"
            con.influence = bone.gp_sim_influence

            chain_ob.parent = rig
            chain_ob.parent_type = "BONE"
            chain_ob.parent_bone = bone.parent.name

            chain_ob.matrix_world = rig.matrix_world @ bone.matrix

            chain_ob.lock_location = [True, True, True]
            chain_ob.lock_scale = [True, True, True]
            chain_ob.lock_rotation = [True, True, True]

            mod = chain_ob.modifiers.new("GP_SoftBody Sim", "SOFT_BODY")

            #

            if bpy.context.scene.use_preview_range:
                mod.point_cache.frame_start = bpy.context.scene.frame_preview_start
                mod.point_cache.frame_end = bpy.context.scene.frame_preview_end
            else:
                mod.point_cache.frame_start = bpy.context.scene.frame_start
                mod.point_cache.frame_end = bpy.context.scene.frame_end

            mod.settings.use_edge_collision = True
            mod.settings.bend = 10
            mod.settings.pull = 1.0
            mod.settings.push = 1.0

            mod.settings.step_min = 100
            mod.settings.choke = 0
            mod.settings.fuzzy = 0

            mod.settings.spring_length = 100

            mod.settings.vertex_group_goal = "Head"
            mod.settings.goal_spring = bone.gp_sim_stiffness
            mod.settings.goal_friction = bone.gp_sim_damping
            mod.settings.goal_default = 1.0
            mod.settings.goal_min = bone.gp_sim_strength
            mod.settings.goal_max = 1.0

            mod.settings.speed = bone.gp_sim_speed

            mod.settings.friction = bone.gp_sim_friction
            mod.settings.mass = bone.gp_sim_mass

            #

        chain_sets.append(chain_obs)

    return chain_sets


def create_spring_chains(chains, coll):

    chain_sets = []
    for c, chain in enumerate(chains):
        next_num = c
        for ob in coll.objects:
            try:
                cur_num = int(
                    ob.name.replace("GP_Jiggle_Root_Ref_", "")
                    .replace("GP_Jiggle_", "")
                    .split("_")[0]
                )

                if next_num < cur_num:
                    next_num = cur_num
            except:
                pass

        num = "%02d" % (next_num + 1)

        chain_obs = []
        for cc, c_dat in enumerate(chain[::-1]):
            b_ind = "%02d" % (cc + 1)

            rig = c_dat[0]
            bone = rig.pose.bones[c_dat[1]]

            bone.gp_has_jg_physics = True
            bone.gp_chain_id = num

            chain_name = "GP_Jiggle_" + num + "_" + b_ind

            chain_ob = create_jg_simple_mesh(
                chain_name,
                bone.length,
            )

            coll.objects.link(chain_ob)

            bone.gp_end_of_chain = cc == 0
            bone.gp_sim_object = chain_ob.name

            c_ob = chain_ob.gp_bone_coll.coll.add()
            c_ob.rig_object = c_dat[0].name
            c_ob.rig_bone = c_dat[1]

            chain_obs.append(chain_ob)

            con = bone.constraints.new("COPY_LOCATION")
            con.name = "GP_Follow"
            con.target = chain_ob
            con.subtarget = "Head"
            con.influence = bone.gp_sim_influence

            chain_ob.parent = rig
            chain_ob.parent_type = "BONE"
            chain_ob.parent_bone = bone.parent.name

            chain_ob.matrix_world = rig.matrix_world @ bone.matrix

            chain_ob.lock_location = [True, True, True]
            chain_ob.lock_scale = [True, True, True]
            chain_ob.lock_rotation = [True, True, True]

            mod = chain_ob.modifiers.new("GP_Jiggle Sim", "SOFT_BODY")

            #

            if bpy.context.scene.use_preview_range:
                mod.point_cache.frame_start = bpy.context.scene.frame_preview_start
                mod.point_cache.frame_end = bpy.context.scene.frame_preview_end
            else:
                mod.point_cache.frame_start = bpy.context.scene.frame_start
                mod.point_cache.frame_end = bpy.context.scene.frame_end

            mod.settings.use_edge_collision = True
            mod.settings.bend = 10
            mod.settings.pull = 1.0
            mod.settings.push = 1.0

            mod.settings.step_min = 100
            mod.settings.choke = 0
            mod.settings.fuzzy = 0

            mod.settings.spring_length = 100

            mod.settings.vertex_group_goal = "Goal"
            mod.settings.goal_spring = bone.gp_sim_stiffness
            mod.settings.goal_friction = bone.gp_sim_damping
            mod.settings.goal_default = 1.0
            mod.settings.goal_min = 0.99
            mod.settings.goal_max = 0.99

            mod.settings.speed = bone.gp_sim_speed

            mod.settings.friction = bone.gp_sim_friction
            mod.settings.mass = bone.gp_sim_mass

            #

        chain_sets.append(chain_obs)

    return chain_sets


def create_cloth_chains(chains, coll):
    prefs = bpy.context.preferences.addons["goo_physics"].preferences

    thick = .001

    chain_obs = []
    for c, chain in enumerate(chains):
        next_num = c
        for ob in coll.objects:
            try:
                cur_num = int(
                    ob.name.replace("GP_Cloth_Chain_Root_Ref_", "")
                    .replace("GP_Cloth_Chain_", "")
                    .split("_")[0]
                )

                if next_num < cur_num:
                    next_num = cur_num
            except:
                pass

        num = "%02d" % (next_num + 1)
        verts, faces = [], []

        for cc, c_dat in enumerate(chain[::-1]):
            rig = c_dat[0]
            bone = rig.pose.bones[c_dat[1]]

            bone.gp_has_cl_physics = True
            bone.gp_chain_id = num

            mat = rig.matrix_world @ bone.matrix

            if cc == 0:
                verts.append(mat @ Vector((thick, 0.0, thick)))
                verts.append(mat @ Vector((-thick, 0.0, thick)))
                verts.append(mat @ Vector((-thick, 0.0, -thick)))
                verts.append(mat @ Vector((thick, 0.0, -thick)))
                faces.append([0, 1, 2, 3])
            else:
                verts[-4] = (verts[-4] + mat @ Vector((thick, 0.0, thick))) * 0.5
                verts[-3] = (verts[-3] + mat @ Vector((-thick, 0.0, thick))) * 0.5
                verts[-2] = (verts[-2] + mat @ Vector((-thick, 0.0, -thick))) * 0.5
                verts[-1] = (verts[-1] + mat @ Vector((thick, 0.0, -thick))) * 0.5

            ind = len(verts) - 4

            verts.append(mat @ Vector((thick, bone.length, thick)))
            verts.append(mat @ Vector((-thick, bone.length, thick)))
            verts.append(mat @ Vector((-thick, bone.length, -thick)))
            verts.append(mat @ Vector((thick, bone.length, -thick)))
            faces.append([ind, ind + 4, ind + 5, ind + 1])
            faces.append([ind + 1, ind + 5, ind + 6, ind + 2])
            faces.append([ind + 2, ind + 6, ind + 7, ind + 3])
            faces.append([ind + 3, ind + 7, ind + 4, ind])

            if cc == len(chain) - 1:
                ind = len(verts) - 4
                faces.append([ind, ind + 1, ind + 2, ind + 3])

            bone.gp_end_of_chain = cc == 0

        #

        rig = chain[-1][0]
        bone = rig.pose.bones[chain[-1][1]]

        chain_name = "GP_Cloth_Chain_" + num
        mesh_dat = bpy.data.meshes.new(chain_name)

        mesh_dat.from_pydata(verts, [], faces)
        mesh_dat.update()

        chain_ob = bpy.data.objects.new(chain_name, mesh_dat)
        coll.objects.link(chain_ob)

        for cc, c_dat in enumerate(chain[::-1]):
            rig = c_dat[0]
            bone = rig.pose.bones[c_dat[1]]

            c_ob = chain_ob.gp_bone_coll.coll.add()
            c_ob.rig_object = rig.name
            c_ob.rig_bone = c_dat[1]

        chain_ob.lock_location = [True, True, True]
        chain_ob.lock_scale = [True, True, True]
        chain_ob.lock_rotation = [True, True, True]

        mod = chain_ob.modifiers.new("GP_Cloth Sim", "CLOTH")

        #

        if bpy.context.scene.use_preview_range:
            mod.point_cache.frame_start = bpy.context.scene.frame_preview_start
            mod.point_cache.frame_end = bpy.context.scene.frame_preview_end
        else:
            mod.point_cache.frame_start = bpy.context.scene.frame_start
            mod.point_cache.frame_end = bpy.context.scene.frame_end

        mod.settings.quality = 12
        mod.settings.mass = bone.gp_chain_mass

        mod.settings.bending_model = "LINEAR"

        mod.settings.use_pressure = True
        mod.settings.uniform_pressure_force = 1.0
        mod.settings.pressure_factor = 0.25

        mod.settings.air_damping = bone.gp_chain_air_dampening

        mod.settings.tension_stiffness = 15.0
        mod.settings.shear_stiffness = 5.0
        mod.settings.bending_stiffness = 1.0

        mod.settings.tension_damping = 5.0
        mod.settings.shear_damping = 5.0
        mod.settings.bending_damping = bone.gp_chain_bend_damping

        mod.settings.time_scale = bone.gp_chain_speed

        pg_name = "Pin"
        pin_group = chain_ob.vertex_groups.new(name=pg_name)
        mod.settings.vertex_group_mass = pg_name

        #

        end_cnt = round(len(chain) * 0.25)
        if end_cnt == 0:
            end_cnt += 1

        fac = 1.0 / end_cnt
        for cc, c_dat in enumerate(chain[::-1]):
            rig = c_dat[0]
            bone = rig.pose.bones[c_dat[1]]

            if cc == 0:
                mat = chain_ob.matrix_world.copy()

                chain_ob.parent = rig
                chain_ob.parent_type = "BONE"
                chain_ob.parent_bone = bone.parent.name

                chain_ob.matrix_world = mat
                chain_ob.matrix_parent_inverse = chain_ob.matrix_basis

                chain_ob.location = [0.0, 0.0, 0.0]
                chain_ob.scale = [1.0, 1.0, 1.0]
                chain_ob.rotation_euler = [0.0, 0.0, 0.0]

                vg = chain_ob.vertex_groups.new(name="Root")
                vg.add([0, 1, 2, 3], 1.0, "REPLACE")

                pin_group.add([0, 1, 2, 3], 1.0, "REPLACE")

            vg_name = "Bone_" + str(cc + 1)
            vg = chain_ob.vertex_groups.new(name=vg_name)
            vg.add(
                [(cc + 1) * 4, (cc + 1) * 4 + 1, (cc + 1) * 4 + 2, (cc + 1) * 4 + 3],
                1.0,
                "REPLACE",
            )

            pin_group.add(
                [cc * 4, cc * 4 + 1, cc * 4 + 2, cc * 4 + 3],
                1.0 - (cc * fac),
                "REPLACE",
            )

            bone.gp_sim_object = chain_ob.name

            con = bone.constraints.new("DAMPED_TRACK")
            con.name = "GP_Track"
            con.target = chain_ob
            con.subtarget = vg_name
            con.influence = bone.gp_sim_influence

        chain_obs.append(chain_ob)

    return chain_obs


def get_preset_data(preset_override=None):
    prefs = bpy.context.preferences.addons["goo_physics"].preferences

    preset_fp = None

    pb = bpy.context.active_pose_bone
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

    if preset_override is not None:
        presets_enum = preset_override

    if preset_fp is not None and os.path.exists(preset_fp):
        presets_data = json.load(open(str(preset_fp)))

        if presets_enum.replace(" ", "").upper() in presets_data.keys():
            p_data = presets_data[presets_enum.replace(" ", "").upper()]["Settings"]
            return p_data
        
        else:
            return None

    return None


def apply_preset(preset_data, bone):

    prefs = bpy.context.preferences.addons["goo_physics"].preferences

    if prefs.apply_to_all_chains:
        sim_chains = get_partial_selected_bone_chains(bpy.context.selected_pose_bones)
    else:
        sim_chains = get_partial_selected_bone_chains(bpy.context.selected_pose_bones_from_active_object, only_active=True)
    
    for s in preset_data.keys():

        if isinstance(preset_data[s], list) == False:

            if hasattr(bone, s):
                setattr(bone, s, preset_data[s])

        else:

            vals = np.array(preset_data[s], dtype=np.float32)

            source_t_vals = np.arange(vals.shape[0], dtype=np.float32) / (vals.shape[0] - 1)
            for chain in sim_chains:

                t_vals = np.arange(len(chain), dtype=np.float32) / (len(chain) - 1)

                tar_inds = np.searchsorted(source_t_vals, t_vals)

                p_inds = tar_inds - 1
                tar_inds[0] = 1
                p_inds[0] = 0

                l_range = source_t_vals[tar_inds] - source_t_vals[p_inds]
                l_fac = (t_vals - source_t_vals[p_inds]) / l_range

                lerp_vals = vals[p_inds] + (vals[tar_inds] - vals[p_inds]) * l_fac

                lerp_vals[0] = vals[0]
                lerp_vals[-1] = vals[-1]

                for b, b_dat in enumerate(chain):
                    bo = b_dat[0].pose.bones[b_dat[1]]

                    if hasattr(bo, s):
                        bo.gp_update = False
                        setattr(bo, s, lerp_vals[b])
                        bo.gp_update = True

    return


def get_falloff(value):
    return 1 - (value * value)


def load_user_presets_to_pref():
    user_presets = Path(bpy.utils.script_path_user()) / "presets" / "goophysics"
    pref_presets = Path(bpy.utils.script_paths_pref()[0]) / "presets" / "goophysics"

    if os.path.exists(bpy.path.abspath(str(user_presets))) == False:
        os.makedirs(bpy.path.abspath(str(user_presets)))

    if os.path.exists(bpy.path.abspath(str(pref_presets))) == False:
        os.makedirs(bpy.path.abspath(str(pref_presets)))

    pref_files = os.listdir(user_presets)
    for file in pref_files:
        if len(file) > 3:
            ext = file[len(file) - 3 : len(file)]
            if ext == ".py":
                shutil.copyfile(
                    bpy.path.abspath(str(user_presets / file)),
                    bpy.path.abspath(str(pref_presets / file)),
                )


def get_inputs_container(node_group):
    if bpy.app.version[0] >= 4:
        input_container = node_group.interface.items_tree

    else:
        input_container = node_group.inputs

    return input_container


def is_addon_enabled(addon_name):
    modules = addon_utils.modules()
    for module in modules:
        module_name = module.__name__
        
        if module_name == addon_name:
            is_enabled = addon_utils.check(module_name)[1]
            return is_enabled
    return False
            

def is_addon_installed(addon_name):
    for module in addon_utils.modules():
        if addon_name == module.__name__:
            return True
    return False


def ensure_collections():

    coll = bpy.data.collections.get("Goo Physics")
    if coll is None or coll.library is not None:
        coll = bpy.data.collections.new("Goo Physics")
        coll.hide_render = True

        if "Shot" in bpy.context.scene.collection.children:
            bpy.context.scene.collection.children["Shot"].children.link(coll)
        else:
            bpy.context.scene.collection.children.link(coll)

    collide_coll = bpy.data.collections.get("Goo Physics Colliders")
    if collide_coll is None or collide_coll.library is not None:
        collide_coll = bpy.data.collections.new("Goo Physics Colliders")
        collide_coll.hide_render = True
        coll.children.link(collide_coll)

    controller_coll = bpy.data.collections.get("Goo Physics Controllers")
    if controller_coll is None or controller_coll.library is not None:
        controller_coll = bpy.data.collections.new("Goo Physics Controllers")
        controller_coll.hide_render = True
        coll.children.link(controller_coll)

    bake_coll = bpy.data.collections.get("Goo Physics Bakes")
    if bake_coll is None or bake_coll.library is not None:
        bake_coll = bpy.data.collections.new("Goo Physics Bakes")
        bake_coll.hide_render = True
        coll.children.link(bake_coll)

    return coll, collide_coll, controller_coll, bake_coll
