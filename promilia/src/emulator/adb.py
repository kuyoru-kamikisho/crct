"""ADB 通信封装。"""

from __future__ import annotations

import logging
import re
import shutil
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger("promilia.emulator.adb")


@dataclass
class DeviceProps:
    model: str = ""
    manufacturer: str = ""
    android_version: str = ""
    sdk: str = ""
    resolution: str = ""
    density: str = ""


@dataclass
class InstalledApp:
    package: str
    name: str = ""


class AdbClient:
    def __init__(self, adb_path: Path | None = None, serial: str | None = None) -> None:
        self.adb_path = adb_path or self._find_adb()
        self.serial = serial

    @staticmethod
    def _find_adb() -> Path | None:
        which = shutil.which("adb")
        return Path(which) if which else None

    def available(self) -> bool:
        return self.adb_path is not None and self.adb_path.is_file()

    def _base_cmd(self) -> list[str]:
        if not self.available():
            raise RuntimeError("未找到 adb 可执行文件")
        cmd = [str(self.adb_path)]
        if self.serial:
            cmd.extend(["-s", self.serial])
        return cmd

    def run(
        self,
        *args: str,
        timeout: float = 30,
        check: bool = False,
    ) -> subprocess.CompletedProcess[str]:
        cmd = self._base_cmd() + list(args)
        logger.debug("ADB: %s", " ".join(cmd))
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout,
                check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0,
            )
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError(f"ADB 命令超时: {' '.join(args)}") from exc
        if check and result.returncode != 0:
            raise RuntimeError(
                f"ADB 失败({result.returncode}): {result.stderr.strip() or result.stdout.strip()}"
            )
        return result

    def start_server(self) -> None:
        self.run("start-server", timeout=20)

    def devices(self) -> list[str]:
        result = self.run("devices", timeout=15)
        serials: list[str] = []
        for line in result.stdout.splitlines():
            line = line.strip()
            if not line or line.startswith("List of devices"):
                continue
            parts = line.split()
            if len(parts) >= 2 and parts[1] == "device":
                serials.append(parts[0])
        return serials

    def wait_for_device(self, timeout: float = 120, poll: float = 2.0) -> str | None:
        """等待任意/指定设备 online，返回 serial。"""
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                self.start_server()
                serials = self.devices()
                if self.serial:
                    if self.serial in serials:
                        return self.serial
                elif serials:
                    self.serial = serials[0]
                    return self.serial
            except Exception as exc:  # noqa: BLE001
                logger.debug("等待设备中: %s", exc)
            time.sleep(poll)
        return None

    def shell(self, command: str, timeout: float = 30) -> str:
        result = self.run("shell", command, timeout=timeout)
        return (result.stdout or "").strip()

    def is_boot_completed(self) -> bool:
        try:
            value = self.shell("getprop sys.boot_completed", timeout=10)
            return value.strip() == "1"
        except Exception:  # noqa: BLE001
            return False

    def wait_boot_completed(self, timeout: float = 120, poll: float = 2.0) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self.is_boot_completed():
                # 再确认 launcher / 桌面进程可见
                if self._has_launcher():
                    return True
            time.sleep(poll)
        return False

    def _has_launcher(self) -> bool:
        try:
            out = self.shell("dumpsys window | grep mCurrentFocus", timeout=15)
            if "Launcher" in out or "launcher" in out.lower():
                return True
            # boot 完成也视为可用
            return self.is_boot_completed()
        except Exception:  # noqa: BLE001
            return self.is_boot_completed()

    def screenshot(self, save_path: Path) -> Path:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        remote = "/sdcard/promilia_shot.png"
        self.shell(f"screencap -p {remote}", timeout=20)
        result = self.run("pull", remote, str(save_path), timeout=30)
        if result.returncode != 0 or not save_path.exists():
            # 回退：exec-out
            cmd = self._base_cmd() + ["exec-out", "screencap", "-p"]
            raw = subprocess.run(
                cmd,
                capture_output=True,
                timeout=30,
                check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0,
            )
            if raw.returncode != 0 or not raw.stdout:
                raise RuntimeError("截图失败")
            save_path.write_bytes(raw.stdout)
        try:
            self.shell(f"rm {remote}", timeout=10)
        except Exception:  # noqa: BLE001
            pass
        return save_path

    def list_packages(self) -> list[str]:
        out = self.shell("pm list packages -3", timeout=40)
        packages: list[str] = []
        for line in out.splitlines():
            line = line.strip()
            if line.startswith("package:"):
                packages.append(line.split("package:", 1)[1].strip())
        if not packages:
            # 回退到全部包
            out = self.shell("pm list packages", timeout=40)
            for line in out.splitlines():
                line = line.strip()
                if line.startswith("package:"):
                    packages.append(line.split("package:", 1)[1].strip())
        return packages

    def app_label(self, package: str) -> str:
        """尽量解析应用显示名；失败则返回空。"""
        try:
            # dumpsys 中偶发含 label
            out = self.shell(f"dumpsys package {package} | grep -i applicationLabel", timeout=20)
            match = re.search(r"applicationLabel(?:Res)?=(.+)", out)
            if match:
                return match.group(1).strip()
        except Exception:  # noqa: BLE001
            pass
        try:
            # 部分系统支持 cmd package
            out = self.shell(f"cmd package resolve-activity --brief {package}", timeout=15)
            if out:
                return ""
        except Exception:  # noqa: BLE001
            pass
        return ""

    def list_installed_apps(self, with_names: bool = True) -> list[InstalledApp]:
        packages = self.list_packages()
        labels: dict[str, str] = {}
        if with_names and packages:
            labels = self._bulk_app_labels(packages)
        apps: list[InstalledApp] = []
        for pkg in packages:
            name = labels.get(pkg, "") if with_names else ""
            apps.append(InstalledApp(package=pkg, name=name or pkg))
        return apps

    def _bulk_app_labels(self, packages: list[str]) -> dict[str, str]:
        """一次 dumpsys 尽量解析显示名，避免逐包查询。"""
        labels: dict[str, str] = {}
        try:
            out = self.shell("dumpsys package packages", timeout=60)
        except Exception as exc:  # noqa: BLE001
            logger.debug("批量解析应用名失败: %s", exc)
            return labels

        current: str | None = None
        for line in out.splitlines():
            pkg_match = re.search(r"Package\s+\[([^\]]+)\]", line)
            if pkg_match:
                current = pkg_match.group(1).strip()
                continue
            if not current:
                continue
            label_match = re.search(
                r"(?:applicationLabel|nonLocalizedLabel|labelResName)\s*[:=]\s*(.+)",
                line,
                re.IGNORECASE,
            )
            if label_match and current not in labels:
                value = label_match.group(1).strip().strip('"')
                if value and not value.startswith("0x"):
                    labels[current] = value
        return {pkg: labels[pkg] for pkg in packages if pkg in labels}

    def get_device_props(self) -> DeviceProps:
        props = DeviceProps(
            model=self.shell("getprop ro.product.model", timeout=10),
            manufacturer=self.shell("getprop ro.product.manufacturer", timeout=10),
            android_version=self.shell("getprop ro.build.version.release", timeout=10),
            sdk=self.shell("getprop ro.build.version.sdk", timeout=10),
            density=self.shell("getprop ro.sf.lcd_density", timeout=10),
        )
        size = self.shell("wm size", timeout=10)
        # Physical size: 1280x720
        match = re.search(r"(\d+)\s*x\s*(\d+)", size, re.IGNORECASE)
        if match:
            props.resolution = f"{match.group(1)}*{match.group(2)}"
        else:
            props.resolution = size or "未知"
        return props

    def is_app_running(self, package: str) -> bool:
        out = self.shell(f"pidof {package}", timeout=10)
        if out.strip():
            return True
        out = self.shell("dumpsys activity activities", timeout=20)
        return package in out

    def start_app(self, package: str) -> bool:
        # monkey 启动更通用
        result = self.run(
            "shell",
            "monkey",
            "-p",
            package,
            "-c",
            "android.intent.category.LAUNCHER",
            "1",
            timeout=30,
        )
        if result.returncode == 0 and "No activities found" not in (result.stdout + result.stderr):
            return True
        # 回退 am start
        launcher = self.shell(
            f"cmd package resolve-activity --brief {package} | tail -n 1",
            timeout=15,
        )
        if launcher and "/" in launcher:
            result = self.run("shell", "am", "start", "-n", launcher.strip(), timeout=20)
            return result.returncode == 0
        result = self.run(
            "shell",
            "am",
            "start",
            "-a",
            "android.intent.action.MAIN",
            "-c",
            "android.intent.category.LAUNCHER",
            package,
            timeout=20,
        )
        return result.returncode == 0

    def find_package_by_name_or_package(
        self,
        package: str,
        name: str,
        apps: list[InstalledApp] | None = None,
    ) -> str | None:
        """按包名或应用名匹配，优先精确包名。"""
        apps = apps or self.list_installed_apps(with_names=True)
        if package:
            for app in apps:
                if app.package == package:
                    return app.package
        if name:
            for app in apps:
                if app.name == name or name in app.name:
                    return app.package
            # 包名列表里也搜一下名称关键字
            for app in apps:
                if name.lower() in app.package.lower():
                    return app.package
        if package:
            # 即使列表未带名，直接尝试包名
            packages = {a.package for a in apps}
            if package in packages:
                return package
        return None
