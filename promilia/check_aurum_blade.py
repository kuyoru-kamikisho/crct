#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检测雷电模拟器「ADB本地调试」、检查「黄金之剑」是否运行；
已运行则截图保存到脚本目录，未运行则启动应用。
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


ENCODING = "utf-8"
APP_LABEL = "黄金之剑"
APP_PACKAGE = "com.oddyarts.AurumBladeNative"
APP_ACTIVITY = "com.oddyarts.AurumBladeNative/com.inject.InjectActivity"
# 雷电多开：第 1 个实例 5555，之后 5557、5559...
ADB_PORTS = list(range(5555, 5600, 2))
# basicSettings.adbDebug: 0=关闭, 1=开启本地连接, 2=开启远程连接
ADB_DEBUG_LOCAL_VALUES = {1, 2}


def _ensure_stdio_utf8() -> None:
    os.environ.setdefault("PYTHONIOENCODING", ENCODING)
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding=ENCODING)  # type: ignore[attr-defined]
        except Exception:
            pass


def _run(
    args: list[str],
    *,
    timeout: float | None = 60,
    check: bool = False,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        capture_output=True,
        text=True,
        encoding=ENCODING,
        errors="replace",
        timeout=timeout,
        check=check,
    )


def find_ldplayer_dir() -> Path:
    """通过 getInstalledApps.ps1 或常见路径定位雷电安装目录。"""
    base = Path(__file__).resolve().parent
    ps1 = base / "getInstalledApps.ps1"
    if ps1.is_file():
        result = _run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(ps1),
            ],
            timeout=120,
        )
        for line in (result.stdout or "").splitlines():
            if "雷电模拟器" not in line:
                continue
            m = re.search(r"\[(.+?)\]\s*$", line.strip())
            if not m:
                continue
            exe = Path(m.group(1).strip().strip('"'))
            if exe.is_file():
                return exe.parent

    for candidate in (
        Path(r"D:\Apps\leidian\LDPlayer9"),
        Path(r"C:\leidian\LDPlayer9"),
        Path(r"C:\LDPlayer\LDPlayer9"),
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "LDPlayer" / "LDPlayer9",
    ):
        if (candidate / "adb.exe").is_file() and (candidate / "dnplayer.exe").is_file():
            return candidate

    raise FileNotFoundError("未找到雷电模拟器安装目录（需含 adb.exe / dnplayer.exe）")


def check_adb_local_debug_enabled(ld_dir: Path) -> tuple[bool, str]:
    """
    检测是否启用 ADB 本地调试：
    1) 读 vms/config/leidian*.config 中 basicSettings.adbDebug
    2) 辅以本机 5555+ 奇数端口是否在监听
    """
    config_dir = ld_dir / "vms" / "config"
    # 只读实例配置 leidian0.config / leidian1.config ...，排除全局 leidians.config
    configs = (
        sorted(
            p
            for p in config_dir.glob("leidian*.config")
            if re.fullmatch(r"leidian\d+\.config", p.name, re.I)
        )
        if config_dir.is_dir()
        else []
    )
    if not configs:
        return False, f"未找到实例配置: {config_dir}\\leidianN.config"

    enabled_files: list[str] = []
    details: list[str] = []
    for cfg in configs:
        try:
            data = json.loads(cfg.read_text(encoding=ENCODING))
        except (OSError, json.JSONDecodeError) as e:
            details.append(f"{cfg.name}: 读取失败 ({e})")
            continue
        value = data.get("basicSettings.adbDebug")
        details.append(f"{cfg.name}: basicSettings.adbDebug={value}")
        if value in ADB_DEBUG_LOCAL_VALUES:
            enabled_files.append(cfg.name)

    if not enabled_files:
        return False, "；".join(details) + "（0=关闭，需在设置中开启「ADB调试-本地连接」）"

    # 运行中时端口监听可作为二次确认（未开机也可能配置已开）
    listening = _listening_adb_ports()
    extra = f"；监听端口={listening or '无'}"
    return True, "；".join(details) + extra


def _listening_adb_ports() -> list[int]:
    result = _run(["netstat", "-ano"], timeout=30)
    ports: list[int] = []
    for line in (result.stdout or "").splitlines():
        if "LISTENING" not in line.upper():
            continue
        for port in ADB_PORTS:
            if f":{port} " in line or line.rstrip().endswith(f":{port}"):
                # netstat 行里常见 "0.0.0.0:5555"
                if re.search(rf":{port}\s", line) and port not in ports:
                    ports.append(port)
    return ports


def adb_bin(ld_dir: Path) -> Path:
    adb = ld_dir / "adb.exe"
    if not adb.is_file():
        raise FileNotFoundError(f"未找到 ADB: {adb}")
    return adb


def adb_cmd(adb: Path, *args: str, serial: str | None = None) -> list[str]:
    cmd = [str(adb)]
    if serial:
        cmd.extend(["-s", serial])
    cmd.extend(args)
    return cmd


def connect_device(adb: Path) -> str:
    """连接雷电 ADB，返回可用 device serial。"""
    # 先看已有 device
    listed = _run(adb_cmd(adb, "devices"))
    for line in (listed.stdout or "").splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 2 and parts[1] == "device":
            return parts[0]

    # 尝试 connect 常见端口
    ports = _listening_adb_ports() or ADB_PORTS[:5]
    last_err = ""
    for port in ports:
        serial = f"127.0.0.1:{port}"
        r = _run(adb_cmd(adb, "connect", serial), timeout=15)
        out = ((r.stdout or "") + (r.stderr or "")).lower()
        last_err = out.strip()
        if "connected" in out or "already connected" in out:
            # 确认状态为 device
            listed = _run(adb_cmd(adb, "devices"))
            for line in (listed.stdout or "").splitlines()[1:]:
                parts = line.split()
                if len(parts) >= 2 and parts[0] == serial and parts[1] == "device":
                    return serial
                if len(parts) >= 2 and parts[1] == "device":
                    return parts[0]

    raise RuntimeError(
        "无法通过 ADB 连接模拟器。请确认已开启「ADB本地调试」且模拟器已启动。"
        + (f" 详情: {last_err}" if last_err else "")
    )


def is_app_running(adb: Path, serial: str, package: str = APP_PACKAGE) -> bool:
    r = _run(adb_cmd(adb, "shell", "pidof", package, serial=serial), timeout=20)
    pid = (r.stdout or "").strip()
    if r.returncode == 0 and pid and re.fullmatch(r"[\d\s]+", pid):
        return True

    # 兜底：查前台/进程列表
    r2 = _run(
        adb_cmd(adb, "shell", "dumpsys", "activity", "activities", serial=serial),
        timeout=30,
    )
    text = r2.stdout or ""
    if package in text and re.search(
        rf"(mResumedActivity|topResumedActivity|mFocusedActivity).*{re.escape(package)}",
        text,
    ):
        return True

    r3 = _run(adb_cmd(adb, "shell", "ps", "-A", serial=serial), timeout=30)
    return package in (r3.stdout or "")


def start_app(adb: Path, serial: str) -> None:
    r = _run(
        adb_cmd(
            adb,
            "shell",
            "am",
            "start",
            "-n",
            APP_ACTIVITY,
            serial=serial,
        ),
        timeout=30,
    )
    out = ((r.stdout or "") + (r.stderr or "")).strip()
    if r.returncode != 0 or "Error" in out:
        # 通用启动方式兜底
        r2 = _run(
            adb_cmd(
                adb,
                "shell",
                "monkey",
                "-p",
                APP_PACKAGE,
                "-c",
                "android.intent.category.LAUNCHER",
                "1",
                serial=serial,
            ),
            timeout=30,
        )
        out2 = ((r2.stdout or "") + (r2.stderr or "")).strip()
        if r2.returncode != 0:
            raise RuntimeError(f"启动 {APP_LABEL} 失败: {out or out2}")


def take_screenshot(adb: Path, serial: str, save_dir: Path) -> Path:
    save_dir.mkdir(parents=True, exist_ok=True)
    remote = "/sdcard/ld_aurum_screenshot.png"
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    local = save_dir / f"黄金之剑_{stamp}.png"

    _run(adb_cmd(adb, "shell", "rm", "-f", remote, serial=serial), timeout=15)
    r = _run(adb_cmd(adb, "shell", "screencap", "-p", remote, serial=serial), timeout=30)
    if r.returncode != 0:
        raise RuntimeError(f"截图失败: {(r.stderr or r.stdout or '').strip()}")

    r2 = _run(adb_cmd(adb, "pull", remote, str(local), serial=serial), timeout=60)
    if r2.returncode != 0 or not local.is_file():
        raise RuntimeError(f"拉取截图失败: {(r2.stderr or r2.stdout or '').strip()}")

    _run(adb_cmd(adb, "shell", "rm", "-f", remote, serial=serial), timeout=15)
    return local


def main() -> int:
    _ensure_stdio_utf8()
    save_dir = Path(__file__).resolve().parent / "game_screenshot"

    try:
        ld_dir = find_ldplayer_dir()
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        return 1

    print(f"雷电目录: {ld_dir}")

    enabled, detail = check_adb_local_debug_enabled(ld_dir)
    if not enabled:
        print(f"ADB本地调试: 未启用 — {detail}", file=sys.stderr)
        print("请在雷电设置 → 其他设置 中开启「ADB调试 - 本地连接」并重启实例。")
        return 1
    print(f"ADB本地调试: 已启用 — {detail}")

    try:
        adb = adb_bin(ld_dir)
        serial = connect_device(adb)
    except (FileNotFoundError, RuntimeError) as e:
        print(str(e), file=sys.stderr)
        return 1

    print(f"ADB 设备: {serial}")

    running = is_app_running(adb, serial)
    if running:
        print(f"「{APP_LABEL}」已在运行，正在截图...")
        try:
            path = take_screenshot(adb, serial, save_dir)
        except RuntimeError as e:
            print(str(e), file=sys.stderr)
            return 1
        print(f"截图已保存: {path}")
        return 0

    print(f"「{APP_LABEL}」未运行，正在启动...")
    try:
        start_app(adb, serial)
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1

    # 稍等进程起来再确认
    time.sleep(2)
    if is_app_running(adb, serial):
        print(f"「{APP_LABEL}」已启动。")
    else:
        print(f"已发送启动指令，请在模拟器中确认「{APP_LABEL}」是否打开。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
