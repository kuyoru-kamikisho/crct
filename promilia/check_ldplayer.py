#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""执行 getInstalledApps.ps1，定位「雷电模拟器」并检测/询问是否启动。"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path


APP_NAME = "雷电模拟器"
SCRIPT_NAME = "getInstalledApps.ps1"
ENCODING = "utf-8"


def _ensure_stdio_utf8() -> None:
    """确保本进程 stdin/stdout/stderr 使用 UTF-8。"""
    os.environ.setdefault("PYTHONIOENCODING", ENCODING)
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding=ENCODING)  # type: ignore[attr-defined]
        except Exception:
            pass


def run_get_installed_apps(script_path: Path) -> str:
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(script_path),
        ],
        capture_output=True,
        text=True,
        encoding=ENCODING,
        errors="strict",
        cwd=str(script_path.parent),
    )
    if result.returncode != 0:
        err = ((result.stderr or result.stdout) or "").strip()
        raise RuntimeError(f"执行 {SCRIPT_NAME} 失败 (code={result.returncode}): {err}")
    return result.stdout or ""


def extract_exe_path(output: str, app_name: str) -> str | None:
    """从「软件名    [路径]」行中截取指定软件的 exe 路径。"""
    # 逐行匹配，容忍 \r、多余空白、名称后缀（如版本号）
    path_re = re.compile(r"\[(.+?)\]\s*$")
    for raw_line in output.splitlines():
        line = raw_line.strip().strip("\ufeff")
        if not line:
            continue
        # 名称在行首：完全相等，或以「名称 + 空白/分隔」开头
        if line == app_name or line.startswith(app_name + " ") or line.startswith(app_name + "\t"):
            m = path_re.search(line)
            if m:
                path = m.group(1).strip().strip('"')
                if path:
                    return path
        # 兜底：行内包含软件名且带 [exe]
        if app_name in line:
            m = path_re.search(line)
            if m:
                path = m.group(1).strip().strip('"')
                if path.lower().endswith(".exe"):
                    return path
    return None


def is_process_running(exe_path: str) -> bool:
    """检测指定 exe 是否在运行（按完整路径匹配）。"""
    target = os.path.normcase(os.path.normpath(exe_path))
    target_name = Path(target).name

    # 用 PowerShell 按 Path 精确匹配，避免仅按进程名误判
    ps = (
        f"$target = [System.IO.Path]::GetFullPath({repr(target)}); "
        f"Get-CimInstance Win32_Process | "
        f"Where-Object {{ $_.ExecutablePath -and "
        f"([System.IO.Path]::GetFullPath($_.ExecutablePath) -ieq $target) }} | "
        f"Select-Object -First 1 ProcessId"
    )
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps],
        capture_output=True,
        text=True,
        encoding=ENCODING,
        errors="replace",
    )
    if result.returncode == 0 and result.stdout.strip():
        return True

    # 回退：按映像名粗查（路径信息不可用时）
    result2 = subprocess.run(
        ["tasklist", "/FI", f"IMAGENAME eq {target_name}", "/FO", "CSV", "/NH"],
        capture_output=True,
        text=True,
        encoding=ENCODING,
        errors="replace",
    )
    out = (result2.stdout or "").strip()
    if out and target_name.lower() in out.lower() and "No tasks" not in out and "没有运行" not in out:
        # 无法确认完整路径时，同名进程视为可能在运行，再二次用 wmic/cim 校验名称即可
        return True
    return False


def ask_yes_no(prompt: str) -> bool:
    while True:
        ans = input(prompt).strip().lower()
        if ans in ("y", "yes", "是", "好", "启动"):
            return True
        if ans in ("n", "no", "否", "不", "取消"):
            return False
        print("请输入 y/n（是/否）")


def start_exe(exe_path: str) -> None:
    # 使用 startfile，与资源管理器双击行为一致
    os.startfile(exe_path)  # type: ignore[attr-defined]


def main() -> int:
    _ensure_stdio_utf8()

    base = Path(__file__).resolve().parent
    script = base / SCRIPT_NAME
    if not script.is_file():
        print(f"未找到脚本: {script}", file=sys.stderr)
        return 1

    print(f"正在执行 {SCRIPT_NAME} ...")
    try:
        output = run_get_installed_apps(script)
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1

    exe_path = extract_exe_path(output, APP_NAME)
    if not exe_path:
        print(f'未在输出中找到「{APP_NAME}」的路径。')
        return 1

    print(f"已找到 {APP_NAME}: [{exe_path}]")

    if not Path(exe_path).is_file():
        print(f"路径不存在或不是文件: {exe_path}", file=sys.stderr)
        return 1

    if is_process_running(exe_path):
        print(f"{APP_NAME} 已在运行。")
        return 0

    print(f"{APP_NAME} 当前未运行。")
    if ask_yes_no("是否启动？[y/n]: "):
        try:
            start_exe(exe_path)
            print(f"已启动: {exe_path}")
        except OSError as e:
            print(f"启动失败: {e}", file=sys.stderr)
            return 1
    else:
        print("已取消启动。")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
