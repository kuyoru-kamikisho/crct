import subprocess
import os

TEXCONV_PATH = r"E:\APPS\Ninja\texconv.exe"

def batch_convert_dds_in_current_dir():
    # 获取脚本运行所在目录
    work_dir = os.getcwd()
    # 新建输出文件夹 dds_png_out
    out_dir = os.path.join(work_dir, "dds_png_out")
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.exists(TEXCONV_PATH):
        print(f"错误：找不到 texconv.exe -> {TEXCONV_PATH}")
        return

    # 遍历当前目录下所有文件
    file_list = [f for f in os.listdir(work_dir) if os.path.isfile(os.path.join(work_dir, f))]
    dds_files = [f for f in file_list if f.lower().endswith(".dds")]

    if not dds_files:
        print("当前目录没有找到任何 .dds 文件")
        return

    print(f"找到 {len(dds_files)} 个DDS文件，开始转换，输出目录：{out_dir}\n")

    success_cnt = 0
    fail_cnt = 0

    for dds_name in dds_files:
        dds_fullpath = os.path.join(work_dir, dds_name)
        # 输出png文件名：同名，放到out_dir
        png_name = os.path.splitext(dds_name)[0] + ".png"
        png_fullpath = os.path.join(out_dir, png_name)

        # texconv 参数：-o 指定输出目录，不写-y = 不覆盖已有文件
        cmd = [
            TEXCONV_PATH,
            "-ft", "png",
            "-o", out_dir,
            dds_fullpath
        ]

        print(f"正在转换: {dds_name}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore"
        )

        if os.path.exists(png_fullpath):
            success_cnt += 1
            print(f"✅成功 -> {png_name}\n")
        else:
            fail_cnt += 1
            print(f"❌转换失败 {dds_name}")
            print(f"stdout:\n{result.stdout}")
            print(f"stderr:\n{result.stderr}\n")

    print("="*50)
    print(f"转换完成。成功：{success_cnt}，失败：{fail_cnt}")
    print(f"所有PNG输出至：{out_dir}")

if __name__ == "__main__":
    batch_convert_dds_in_current_dir()
