#!/usr/bin/env python3
"""从视频链接解析并下载视频。

运行时传入一个链接；未传参数时先说明用法，再等待输入。
下载前显示视频标题，可改成自定义文件名。文件保存到启动脚本时的当前目录。
"""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path
from urllib.parse import urlparse

USAGE = """\
videoDownloader — 视频下载

解析视频页面并下载到运行本脚本时的当前目录。
支持哔哩哔哩、YouTube、抖音。带播放列表参数的链接只下载当前这一条。

用法：
  python videoDownloader.py <视频链接>
  python videoDownloader.py

不带参数时，会显示这段说明并等待输入链接。
解析完成后显示视频标题，直接回车即用标题作为文件名，也可以另输入一个名称。

依赖：
  python -m pip install -U yt-dlp
安装 ffmpeg 后可把分离的画面和声音合并成高清 mp4。
未安装 ffmpeg 时，若已安装 imageio-ffmpeg，脚本会使用它自带的 ffmpeg。

若哔哩哔哩、YouTube 或抖音要求登录或校验，请导出 Netscape 格式的 cookies.txt：
  python videoDownloader.py --cookies cookies.txt <视频链接>
"""

HELP_FLAGS = {"-h", "--help", "/?"}
MEDIA_SUFFIXES = {
    ".mp4", ".mkv", ".webm", ".flv", ".mov", ".m4v", ".avi", ".ts", ".m4a",
}
WINDOWS_RESERVED = {
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}
EXTRACTOR_NAMES = {
    "BiliBili": "哔哩哔哩",
    "BilibiliSpace": "哔哩哔哩",
    "Youtube": "YouTube",
    "Douyin": "抖音",
}


class VideoDownloaderError(Exception):
    """用户可直接阅读的失败原因。"""


def configure_stdio() -> None:
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding="utf-8", line_buffering=True)
        except TypeError:
            try:
                reconfigure(encoding="utf-8")
            except (OSError, ValueError):
                pass
        except (OSError, ValueError):
            pass


def extract_url(text: str) -> str:
    urls = re.findall(r"https?://[^\s\"'<>]+", text.strip())
    if not urls:
        raise VideoDownloaderError("请输入以 http:// 或 https:// 开头的视频链接。")
    if len(urls) > 1:
        print("检测到多个链接，只下载第一个。")
    return urls[0].rstrip(".,);]}")


def parse_args(args: list[str]) -> tuple[str | None, str | None]:
    cookies = None
    rest: list[str] = []
    index = 0
    while index < len(args):
        token = args[index]
        if token in HELP_FLAGS:
            print(USAGE, end="")
            raise SystemExit(0)
        if token in {"--cookies", "-c"}:
            if index + 1 >= len(args):
                raise VideoDownloaderError("请在 --cookies 后面加上 Cookie 文件路径。")
            cookies = args[index + 1]
            index += 2
            continue
        rest.append(token)
        index += 1
    if cookies and not Path(cookies).is_file():
        raise VideoDownloaderError(f"找不到 Cookie 文件：{cookies}")
    if not rest:
        return None, cookies
    return extract_url(" ".join(rest)), cookies


def prompt_url() -> str:
    print(USAGE)
    try:
        entered = input("请输入视频链接：")
    except EOFError as exc:
        raise VideoDownloaderError("未输入链接。") from exc
    return extract_url(entered)


def runtime_options() -> dict:
    for name in ("deno", "node", "bun"):
        path = shutil.which(name)
        if not path:
            continue
        return {
            "js_runtimes": {name: {"path": path}},
            "remote_components": ["ejs:github"],
        }
    return {}


def load_yt_dlp():
    try:
        import yt_dlp
    except ImportError as exc:
        raise VideoDownloaderError(
            "缺少依赖 yt-dlp。请先执行：python -m pip install -U yt-dlp"
        ) from exc
    return yt_dlp


def find_ffmpeg() -> str | None:
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg
    except ImportError:
        return None
    try:
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def site_name(info: dict) -> str:
    key = info.get("extractor_key") or info.get("extractor") or ""
    if key in EXTRACTOR_NAMES:
        return EXTRACTOR_NAMES[key]
    host = urlparse(info.get("webpage_url") or info.get("original_url") or "").netloc
    return host or "该网站"


def unwrap_entry(info: dict) -> dict:
    kind = info.get("_type")
    if kind not in {"playlist", "multi_video"}:
        return info
    entries = [entry for entry in info.get("entries") or [] if entry]
    if not entries:
        raise VideoDownloaderError("这个链接里没有可下载的视频。")
    if len(entries) > 1:
        print(f"该链接包含 {len(entries)} 个视频，本次只下载当前这一条。")
    entry = entries[0]
    if entry.get("_type") in {"url", "url_transparent"} and not entry.get("formats"):
        raise VideoDownloaderError("未能展开播放列表中的视频，请换一条具体的视频链接。")
    return entry


def has_video(info: dict) -> bool:
    if info.get("vcodec") not in (None, "none"):
        return True
    for fmt in info.get("formats") or []:
        if fmt.get("vcodec") not in (None, "none"):
            return True
    return (info.get("ext") or "").lower() in MEDIA_SUFFIXES - {".m4a"}


def format_duration(seconds: object) -> str:
    if not isinstance(seconds, (int, float)) or seconds <= 0:
        return "未知"
    total = int(seconds)
    hours, rem = divmod(total, 3600)
    minutes, secs = divmod(rem, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def best_height(info: dict) -> str:
    height = info.get("height") or 0
    if not height:
        heights = [fmt.get("height") or 0 for fmt in info.get("formats") or []]
        height = max(heights, default=0)
    return f"{height}p" if height else "自动"


def print_summary(info: dict) -> None:
    author = info.get("uploader") or info.get("channel") or info.get("creator")
    print(f"来源：{site_name(info)}")
    print(f"标题：{info.get('title') or '未命名视频'}")
    if author:
        print(f"作者：{author}")
    print(f"时长：{format_duration(info.get('duration'))}")
    print(f"可用清晰度：{best_height(info)}")


def sanitize_stem(name: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name).strip().strip(".")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    path = Path(cleaned)
    if path.suffix.lower() in MEDIA_SUFFIXES:
        cleaned = path.stem.strip().strip(".")
    if not cleaned or cleaned.upper() in WINDOWS_RESERVED:
        cleaned = "video"
    if len(cleaned) > 120:
        cleaned = cleaned[:120].rstrip(" .")
    return cleaned or "video"


def files_with_stem(directory: Path, stem: str) -> list[Path]:
    found = []
    for path in directory.iterdir():
        if path.is_file() and path.stem == stem and path.suffix.lower() not in {".part", ".ytdl"}:
            found.append(path)
    return found


def unique_stem(directory: Path, stem: str) -> str:
    if not files_with_stem(directory, stem):
        return stem
    number = 2
    while files_with_stem(directory, f"{stem} ({number})"):
        number += 1
        if number > 999:
            break
    return f"{stem} ({number})"


def prompt_line(prompt: str) -> str:
    try:
        if sys.stdin.isatty():
            return input(prompt).strip()
        print(prompt)
        return sys.stdin.readline().strip()
    except EOFError:
        return ""


def choose_stem(directory: Path, title: str) -> tuple[str, bool]:
    suggested = sanitize_stem(title)
    candidate = prompt_line("保存文件名（直接回车使用标题）：")
    while True:
        stem = sanitize_stem(candidate or suggested)
        existing = files_with_stem(directory, stem)
        if not existing:
            return stem, False
        names = "、".join(path.name for path in existing)
        print(f"当前目录已有同名文件：{names}")
        answer = prompt_line("输入 y 覆盖，直接回车自动加序号，或输入新的文件名：")
        if answer.lower() == "y":
            return stem, True
        if answer == "":
            return unique_stem(directory, stem), False
        candidate = answer


def base_options(cookiefile: str | None = None) -> dict:
    """解析与下载共用的基础选项。注意：这里不限制 format，避免解析阶段因无合并轨失败。"""
    options = {
        "noplaylist": True,
        "retries": 5,
        "fragment_retries": 5,
        "socket_timeout": 30,
        "windowsfilenames": False,
        "restrictfilenames": False,
        "continuedl": True,
        "noprogress": False,
        # 解析时列出全部格式；真正下载时再按是否有 ffmpeg 选择
        "format": "bv*+ba/b",
    }
    options.update(runtime_options())
    if cookiefile:
        options["cookiefile"] = cookiefile
    return options


def format_has_audio_and_video(fmt: dict) -> bool:
    return (
        fmt.get("vcodec") not in (None, "none")
        and fmt.get("acodec") not in (None, "none")
    )


def has_combined_format(info: dict) -> bool:
    if format_has_audio_and_video(info):
        return True
    return any(format_has_audio_and_video(fmt) for fmt in info.get("formats") or [])


def has_separate_av(info: dict) -> bool:
    has_v = False
    has_a = False
    for fmt in info.get("formats") or []:
        v = fmt.get("vcodec") not in (None, "none")
        a = fmt.get("acodec") not in (None, "none")
        if v and not a:
            has_v = True
        if a and not v:
            has_a = True
    return has_v and has_a


def download_format_options(ffmpeg: str | None, info: dict) -> dict:
    """根据已解析到的格式与 ffmpeg 情况选择下载策略。"""
    options: dict = {}
    if ffmpeg:
        options["ffmpeg_location"] = ffmpeg
        options["format"] = "bv*+ba/b"
        options["merge_output_format"] = "mp4"
        return options

    if has_combined_format(info):
        # 无 ffmpeg 时优先选已含声音的单文件
        options["format"] = "b"
        return options

    if has_separate_av(info):
        raise VideoDownloaderError(
            "视频已解析成功，但该站点只提供「画面 / 声音分离」的格式，"
            "合并成完整视频需要 ffmpeg。\n"
            "请安装 ffmpeg 并加入 PATH，或执行：python -m pip install imageio-ffmpeg"
        )

    options["format"] = "b"
    return options


class _QuietLogger:
    def debug(self, msg):
        return

    def info(self, msg):
        return

    def warning(self, msg):
        return

    def error(self, msg):
        return


def fetch_info(url: str, yt_dlp, cookiefile: str | None = None) -> dict:
    """只负责解析视频元数据与可用格式，不因 ffmpeg 缺失而失败。"""
    options = base_options(cookiefile)
    options.update({
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "logger": _QuietLogger(),
        # 不强行选定最终下载格式，避免「Requested format is not available」打断解析
        "format": "all",
    })
    last_error: Exception | None = None
    info = None
    for attempt in range(1, 4):
        try:
            with yt_dlp.YoutubeDL(options) as ydl:
                info = ydl.extract_info(url, download=False)
            break
        except Exception as exc:  # noqa: BLE001 — 网络偶发 SSL 失败时重试
            last_error = exc
            if attempt < 3:
                print(f"解析遇到网络问题，正在重试（{attempt}/3）…")
            else:
                raise
    if info is None:
        if last_error is not None:
            raise last_error
        raise VideoDownloaderError("没有解析到视频信息。")
    info = unwrap_entry(info)
    if not has_video(info):
        raise VideoDownloaderError("这个链接不是可下载的视频（可能是图集或纯音频）。")
    return info


def saved_filepath(info: dict, directory: Path, stem: str) -> Path | None:
    candidates: list[str] = []
    for item in info.get("requested_downloads") or []:
        path = item.get("filepath") or item.get("filename")
        if path:
            candidates.append(path)
    for key in ("filepath", "_filename"):
        if info.get(key):
            candidates.append(info[key])
    for candidate in reversed(candidates):
        path = Path(candidate)
        if path.is_file():
            return path
    matches = sorted(files_with_stem(directory, stem), key=lambda path: path.stat().st_mtime)
    return matches[-1] if matches else None


def download(
    url: str,
    directory: Path,
    stem: str,
    overwrite: bool,
    yt_dlp,
    ffmpeg: str | None,
    info: dict,
    cookiefile: str | None = None,
) -> Path:
    options = base_options(cookiefile)
    options.update(download_format_options(ffmpeg, info))
    options.update({
        "quiet": False,
        "no_warnings": False,
        "paths": {"home": str(directory)},
        "outtmpl": stem.replace("%", "%%") + ".%(ext)s",
        "overwrites": overwrite,
        "continuedl": not overwrite,
    })
    extension = "mp4" if ffmpeg or options.get("merge_output_format") == "mp4" else "视频格式对应的扩展名"
    print(f"将保存到：{directory}")
    print(f"文件名：{stem}.{extension}")
    print("开始下载…")
    with yt_dlp.YoutubeDL(options) as ydl:
        result = ydl.extract_info(url, download=True)
    if not result:
        raise VideoDownloaderError("下载没有返回结果。")
    path = saved_filepath(result, directory, stem)
    if path is None and result.get("_type") in {"playlist", "multi_video"}:
        path = saved_filepath(unwrap_entry(result), directory, stem)
    if path is None:
        raise VideoDownloaderError("下载结束，但没有在当前目录找到视频文件。")
    return path


def clean_message(exc: Exception) -> str:
    text = str(exc).strip()
    text = re.sub(r"^ERROR:\s*", "", text)
    lowered = text.lower()
    if "unsupported url" in lowered:
        return "暂不支持该链接。目前支持哔哩哔哩、YouTube 和抖音。\n" + text
    if "fresh cookies" in lowered or "sign in to confirm" in lowered:
        return (
            "这个站点需要 Cookie 才能解析视频。请在浏览器打开并播放该视频，"
            "导出 Netscape 格式的 cookies.txt 后重试：\n"
            "python videoDownloader.py --cookies cookies.txt <视频链接>"
        )
    if "unable to download webpage" in lowered or "unexpected_eof" in lowered or "ssl" in lowered:
        return (
            "解析视频页面时网络/SSL 失败，请检查网络后重试。\n" + text
        )
    if "requested format is not available" in lowered:
        return (
            "已解析到视频，但当前没有可用的下载格式。"
            "若画面与声音是分开的，请安装 ffmpeg 后再下：\n"
            "python -m pip install imageio-ffmpeg"
        )
    if "ffmpeg" in lowered and ("not installed" in lowered or "not found" in lowered):
        return text + "\n请安装 ffmpeg，或执行：python -m pip install imageio-ffmpeg"
    return text or exc.__class__.__name__


def main(argv: list[str] | None = None) -> int:
    configure_stdio()
    args = list(sys.argv[1:] if argv is None else argv)
    try:
        url, cookies = parse_args(args)
        if url is None:
            url = prompt_url()
        yt_dlp = load_yt_dlp()
        print(f"正在解析：{url}")
        info = fetch_info(url, yt_dlp, cookies)
        title = (info.get("title") or "video").strip() or "video"
        print_summary(info)
        formats = info.get("formats") or []
        print(f"解析到 {len(formats)} 种格式"
              f"（含声音单文件：{'有' if has_combined_format(info) else '无'}；"
              f"分离音视频：{'有' if has_separate_av(info) else '无'}）")
        print()

        ffmpeg = find_ffmpeg()
        if ffmpeg is None and has_separate_av(info) and not has_combined_format(info):
            print("该视频只有分离的画面/声音轨，需要 ffmpeg 才能合并下载。")
            print("可先执行：python -m pip install imageio-ffmpeg")
            answer = prompt_line("若已安装可直接回车继续，输入 n 取消：")
            if answer.lower() in {"n", "no", "q"}:
                raise VideoDownloaderError("已取消下载。")
            ffmpeg = find_ffmpeg()
            if ffmpeg is None:
                raise VideoDownloaderError(
                    "仍未检测到 ffmpeg。\n"
                    "请安装后重试：python -m pip install imageio-ffmpeg\n"
                    "或将系统 ffmpeg 加入 PATH。"
                )
            print(f"已找到 ffmpeg：{ffmpeg}")
        elif ffmpeg is None:
            print("未检测到 ffmpeg；将尝试下载已含声音的单文件。")

        directory = Path.cwd()
        stem, overwrite = choose_stem(directory, title)
        saved = download(url, directory, stem, overwrite, yt_dlp, ffmpeg, info, cookies)
        print(f"下载完成：{saved}")
        return 0
    except VideoDownloaderError as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 1
    except SystemExit:
        raise
    except KeyboardInterrupt:
        print("\n已取消。", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"错误：{clean_message(exc)}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
