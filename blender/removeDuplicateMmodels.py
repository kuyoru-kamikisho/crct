import bpy

def get_obj_signature(obj, round_digit=3):
    """生成物体特征签名，用于判断是否相似"""
    b = obj.bound_box
    xs = [p[0] for p in b]
    ys = [p[1] for p in b]
    zs = [p[2] for p in b]
    dx = round(max(xs)-min(xs), round_digit)
    dy = round(max(ys)-min(ys), round_digit)
    dz = round(max(zs)-min(zs), round_digit)
    vert_count = len(obj.data.vertices)
    # 允许顶点数量 ±5% 的浮动，适配ninja ripper导出微小差异
    return (dx, dy, dz, vert_count)

# ========== 配置参数（你可以微调） ==========
vert_tolerance_ratio = 0.05  # 顶点数量误差阈值 5%，ripper模型推荐 0.03~0.08
# ===========================================

all_meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
print(f"场景内一共找到 {len(all_meshes)} 个Mesh物体")

# 分组存储相似物体
groups = []
used = set()

for idx, obj in enumerate(all_meshes):
    if obj in used:
        continue
    sig = get_obj_signature(obj)
    v_base = sig[3]
    group = [obj]
    # 和剩下所有未归类物体比对
    for other in all_meshes:
        if other == obj or other in used:
            continue
        sig2 = get_obj_signature(other)
        v_other = sig2[3]
        # 包围盒尺寸一致，顶点数量在误差范围内
        if sig[0:3]==sig2[0:3] and abs(v_other - v_base) <= v_base * vert_tolerance_ratio:
            group.append(other)
    if len(group)>=2:
        groups.append(group)
        for g_obj in group:
            used.add(g_obj)

deleted_count = 0
# 处理每一组重复物体，每组保留第一个，删除其余
for g in groups:
    keep = g[0]
    for del_obj in g[1:]:
        bpy.data.objects.remove(del_obj)
        deleted_count += 1

print(f"\n✅扫描完成！一共找到 {len(groups)} 组重复模型")
print(f"✅自动删除 {deleted_count} 个重复物体")
