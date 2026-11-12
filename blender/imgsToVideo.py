# -*- coding: utf-8 -*-
"""
图像序列转视频

将 Blender 渲染动画输出的图片序列合并为 MP4。
启动后交互式询问：图片目录、输出文件名、帧率、输出目录。
依赖：imageio-ffmpeg（自带 ffmpeg 可执行文件）。
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".tga", ".tif", ".tiff", ".webp"}


def ask(prompt: str, default: str) -> str:
    raw = input(f"{prompt} [{default}]: ").strip()
    return raw if raw else default


def ask_yes_no(prompt: str, default: bool = False) -> bool:
    hint = "Y/n" if default else "y/N"
    raw = input(f"{prompt} ({hint}): ").strip().lower()
    if not raw:
        return default
    return raw in ("y", "yes", "是")


def natural_key(name: str):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def get_ffmpeg() -> str:
    try:
        import imageio_ffmpeg
    except ImportError as exc:
        raise RuntimeError(
            "未安装 imageio-ffmpeg。请执行: python -m pip install imageio-ffmpeg"
        ) from exc
    path = imageio_ffmpeg.get_ffmpeg_exe()
    if not path or not os.path.isfile(path):
        raise RuntimeError("无法定位 ffmpeg 可执行文件")
    return path


def collect_images(image_dir: Path) -> list[Path]:
    files = [
        p
        for p in image_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    ]
    if not files:
        return []

    # 按扩展名分组，取数量最多的一组（避免混入无关缩略图）
    by_ext: dict[str, list[Path]] = {}
    for p in files:
        by_ext.setdefault(p.suffix.lower(), []).append(p)
    best_ext = max(by_ext, key=lambda e: len(by_ext[e]))
    images = sorted(by_ext[best_ext], key=lambda p: natural_key(p.name))
    return images


def detect_ffmpeg_pattern(images: list[Path]) -> tuple[str, int] | None:
    """若为连续编号序列，返回 (ffmpeg 输入模式, start_number)，否则 None。"""
    if len(images) < 2:
        return None

    # 匹配末尾编号：name_0001.png / name0001.png / 0001.png
    pat = re.compile(r"^(.*?)(\d+)(\.[^.]+)$")
    parsed = []
    for p in images:
        m = pat.match(p.name)
        if not m:
            return None
        prefix, digits, suffix = m.group(1), m.group(2), m.group(3)
        parsed.append((prefix, int(digits), len(digits), suffix))

    prefix0, num0, width0, suffix0 = parsed[0]
    for i, (prefix, num, width, suffix) in enumerate(parsed):
        if prefix != prefix0 or suffix != suffix0 or width != width0:
            return None
        if num != num0 + i:
            return None

    pattern = f"{prefix0}%0{width0}d{suffix0}"
    return pattern, num0


def build_concat_list(images: list[Path], list_path: Path) -> None:
    # concat demuxer 在 Windows 上对反斜杠敏感，统一用正斜杠
    with list_path.open("w", encoding="utf-8") as f:
        for img in images:
            path = img.resolve().as_posix().replace("'", r"'\''")
            f.write(f"file '{path}'\n")


def encode_video(
    ffmpeg: str,
    images: list[Path],
    out_path: Path,
    fps: float,
) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)

    pattern_info = detect_ffmpeg_pattern(images)
    common = [
        ffmpeg,
        "-hide_banner",
        "-y",
        "-framerate",
        str(fps),
    ]

    # H.264 + yuv420p，兼容大多数播放器；CRF 18 接近视觉无损
    encode = [
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "18",
        "-preset",
        "fast",
        "-movflags",
        "+faststart",
        str(out_path),
    ]

    if pattern_info is not None:
        pattern, start_number = pattern_info
        input_path = str(images[0].parent / pattern)
        cmd = common + [
            "-start_number",
            str(start_number),
            "-i",
            input_path,
            "-frames:v",
            str(len(images)),
        ] + encode
        print(f"检测到连续序列，使用模式: {pattern} (起始帧 {start_number})")
        print("正在编码...\n")
        subprocess.run(cmd, check=True)
        return

    # 非标准命名：用 concat 列表
    with tempfile.TemporaryDirectory(prefix="imgs2vid_") as tmp:
        list_path = Path(tmp) / "concat.txt"
        build_concat_list(images, list_path)
        cmd = common + [
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_path),
        ] + encode
        print("文件名非标准编号序列，使用 concat 模式")
        print("正在编码...\n")
        subprocess.run(cmd, check=True)


def main() -> int:
    cwd = Path.cwd()
    print("=" * 50)
    print("  Blender 图片序列 → MP4")
    print("=" * 50)
    print(f"当前工作目录: {cwd}\n")

    image_dir = Path(ask("图片序列所在目录", str(cwd))).expanduser()
    if not image_dir.is_absolute():
        image_dir = (cwd / image_dir).resolve()
    else:
        image_dir = image_dir.resolve()

    if not image_dir.is_dir():
        print(f"错误：目录不存在 -> {image_dir}")
        return 1

    out_name = ask("输出视频文件名", "output.mp4")
    if not out_name.lower().endswith(".mp4"):
        out_name += ".mp4"

    while True:
        fps_raw = ask("输出视频帧率 (fps)", "24")
        try:
            fps = float(fps_raw)
            if fps <= 0:
                raise ValueError
            break
        except ValueError:
            print("请输入大于 0 的数字")

    out_dir = Path(ask("输出目录", str(cwd))).expanduser()
    if not out_dir.is_absolute():
        out_dir = (cwd / out_dir).resolve()
    else:
        out_dir = out_dir.resolve()

    out_path = out_dir / out_name

    images = collect_images(image_dir)
    if not images:
        print(f"错误：在 {image_dir} 中未找到支持的图片 "
              f"({', '.join(sorted(IMAGE_EXTS))})")
        return 1

    print(f"\n找到 {len(images)} 张图片 ({images[0].suffix.lower()})")
    print(f"  首帧: {images[0].name}")
    print(f"  末帧: {images[-1].name}")
    print(f"  帧率: {fps} fps  →  时长约 {len(images) / fps:.2f} 秒")
    print(f"  输出: {out_path}")

    if out_path.exists():
        if not ask_yes_no(f"\n输出文件已存在，是否覆盖？\n  {out_path}", default=False):
            print("已取消")
            return 0

    try:
        ffmpeg = get_ffmpeg()
    except RuntimeError as e:
        print(f"错误：{e}")
        return 1

    print(f"\nffmpeg: {ffmpeg}")
    try:
        encode_video(ffmpeg, images, out_path, fps)
    except subprocess.CalledProcessError as e:
        print(f"\n错误：ffmpeg 编码失败 (exit {e.returncode})")
        return 1
    except KeyboardInterrupt:
        print("\n已中断")
        return 130

    size_mb = out_path.stat().st_size / (1024 * 1024)
    print("\n" + "=" * 50)
    print(f"完成：{out_path}")
    print(f"大小：{size_mb:.2f} MB  |  {len(images)} 帧 @ {fps} fps")
    print("=" * 50)
    return 0


if __name__ == "__main__":
    sys.exit(main())
