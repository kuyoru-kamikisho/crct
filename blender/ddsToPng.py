import bpy
import subprocess
import os

# ===================== 这个自己下载texconv完整路径 =====================
TEXCONV_PATH = r"E:\APPS\Ninja\texconv.exe"
# =====================================================================

def convert_dds_to_png_and_replace():
    if not os.path.exists(TEXCONV_PATH):
        print(f"错误：找不到 texconv.exe 路径：{TEXCONV_PATH}")
        return

    processed_images = set()
    replaced_count = 0

    for img in bpy.data.images:
        if img in processed_images or img.filepath_raw == "":
            continue
        filepath = bpy.path.abspath(img.filepath_raw)
        ext = os.path.splitext(filepath)[1].lower()
        if ext != ".dds":
            continue

        if not os.path.exists(filepath):
            print(f"贴图文件丢失，跳过：{filepath}")
            processed_images.add(img)
            continue

        base_path = os.path.splitext(filepath)[0]
        png_path = base_path + ".png"
        # 获取dds所在文件夹，作为texconv的工作目录
        dds_folder = os.path.dirname(filepath)

        print(f"\n正在转换：{filepath} -> {png_path}")
        cmd = [
            TEXCONV_PATH,
            "-ft", "png",
            # "-y",
            filepath
        ]
        # cwd 参数：在dds文件夹内执行texconv，输出png就保存在这里
        result = subprocess.run(
            cmd,
            cwd=dds_folder,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore"
        )
        # 打印texconv输出日志，方便排错
        print("texconv stdout:\n", result.stdout)
        print("texconv stderr:\n", result.stderr)

        # 判断目标png是否生成
        if os.path.exists(png_path):
            new_img = bpy.data.images.load(png_path)
            img.user_remap(new_img)
            bpy.data.images.remove(img)
            replaced_count +=1
            print(f"✅替换成功：{os.path.basename(filepath)} → {os.path.basename(png_path)}")
        else:
            print(f"❌转换失败 {filepath} ：没有生成png文件")
        processed_images.add(img)

    print(f"\n===== 完成！一共替换 {replaced_count} 个DDS贴图为PNG =====")

convert_dds_to_png_and_replace()
