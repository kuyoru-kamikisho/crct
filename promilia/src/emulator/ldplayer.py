"""雷电模拟器控制（ldconsole + adb）。"""

from __future__ import annotations

import logging
import re
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path

from .adb import AdbClient
from .detector import EmulatorInfo

logger = logging.getLogger("promilia.emulator.ldplayer")


@dataclass
class LDInstance:
    index: int
    title: str
    top_hwnd: int
    bind_hwnd: int
    android_started: bool
    pid: int
    vbox_pid: int


class LDPlayerController:
    def __init__(self, info: EmulatorInfo, index: int = 0) -> None:
        self.info = info
        self.index = index
        self.console = info.console_path
        if not self.console or not self.console.is_file():
            raise RuntimeError(f"未找到雷电控制台: {info.install_path}")
        self.adb = self._build_adb()

    def _build_adb(self) -> AdbClient:
        candidates = [
            self.info.install_path / "adb.exe",
            self.info.install_path / "ldadb.exe",
        ]
        adb_path = next((p for p in candidates if p.is_file()), None)
        return AdbClient(adb_path=adb_path)

    def _run_console(self, *args: str, timeout: float = 60) -> subprocess.CompletedProcess[str]:
        cmd = [str(self.console), *args]
        logger.debug("ldconsole: %s", " ".join(cmd))
        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
            creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0,
        )

    def list_instances(self) -> list[LDInstance]:
        """解析 ldconsole list2 输出。"""
        result = self._run_console("list2", timeout=30)
        instances: list[LDInstance] = []
        for line in (result.stdout or "").splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split(",")
            if len(parts) < 7:
                continue
            try:
                instances.append(
                    LDInstance(
                        index=int(parts[0]),
                        title=parts[1],
                        top_hwnd=int(parts[2] or 0),
                        bind_hwnd=int(parts[3] or 0),
                        android_started=parts[4] == "1",
                        pid=int(parts[5] or 0),
                        vbox_pid=int(parts[6] or 0),
                    )
                )
            except ValueError:
                logger.debug("无法解析实例行: %s", line)
        return instances

    def get_instance(self) -> LDInstance | None:
        for inst in self.list_instances():
            if inst.index == self.index:
                return inst
        return None

    def is_running(self) -> bool:
        inst = self.get_instance()
        if not inst:
            return False
        return inst.android_started or inst.pid > 0

    def launch(self) -> None:
        logger.info("启动雷电实例 index=%s", self.index)
        result = self._run_console("launch", "--index", str(self.index), timeout=30)
        if result.returncode != 0:
            # 某些版本即便成功也返回非 0，仅记录
            logger.warning(
                "launch 返回码 %s: %s",
                result.returncode,
                (result.stderr or result.stdout or "").strip(),
            )

    def quit(self) -> None:
        self._run_console("quit", "--index", str(self.index), timeout=30)

    def connect_adb(self) -> AdbClient:
        """通过 ldconsole adb 或本地 adb 连接实例。"""
        # 优先让雷电自己拉起 adb 通道
        self._run_console(
            "adb",
            "--index",
            str(self.index),
            "--command",
            "devices",
            timeout=30,
        )
        # 常见雷电端口: 5555 + index*2
        preferred_serials = [
            f"emulator-{5554 + self.index * 2}",
            f"127.0.0.1:{5555 + self.index * 2}",
            f"127.0.0.1:{5555 + self.index}",
        ]
        if not self.adb.available():
            # 尝试用 console 的 adb 路径再找一次
            raise RuntimeError("雷电目录下未找到 adb.exe，请检查安装完整性")

        self.adb.start_server()
        serials = self.adb.devices()
        for serial in preferred_serials:
            if serial in serials:
                self.adb.serial = serial
                return self.adb
        if serials:
            self.adb.serial = serials[0]
            return self.adb

        # 主动 connect 常见端口
        for serial in preferred_serials:
            if ":" in serial:
                self.adb.run("connect", serial, timeout=10)
        serials = self.adb.devices()
        if serials:
            self.adb.serial = serials[0]
            return self.adb
        return self.adb

    def wait_until_ready(self, timeout: float = 120, poll: float = 2.0) -> bool:
        """监听启动，直到 ADB 可通信且 boot 完成。"""
        deadline = time.time() + timeout
        info_shown = False
        while time.time() < deadline:
            inst = self.get_instance()
            if inst and (inst.android_started or inst.pid > 0):
                if not info_shown:
                    logger.info("模拟器进程已启动，等待系统就绪...")
                    info_shown = True
                try:
                    self.connect_adb()
                    serial = self.adb.wait_for_device(timeout=max(5, poll), poll=1)
                    if serial and self.adb.wait_boot_completed(timeout=max(5, poll), poll=1):
                        logger.info("模拟器已进入桌面，设备: %s", serial)
                        return True
                except Exception as exc:  # noqa: BLE001
                    logger.debug("等待就绪: %s", exc)
            time.sleep(poll)
        return False

    def launch_app_via_console(self, package: str) -> bool:
        result = self._run_console(
            "runapp",
            "--index",
            str(self.index),
            "--packagename",
            package,
            timeout=30,
        )
        return result.returncode == 0

    def get_resolution_from_config(self) -> str:
        """尝试从雷电配置文件读取分辨率。"""
        config_candidates = [
            self.info.install_path / "vms" / "config" / f"leidian{self.index}.config",
            self.info.install_path / "vms" / f"leidian{self.index}" / "config.ini",
            Path.home() / "Documents" / "XuanZhi" / "config" / f"leidian{self.index}.config",
        ]
        for path in config_candidates:
            if not path.is_file():
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            width = re.search(r'"width"\s*:\s*(\d+)', text) or re.search(
                r"width\s*=\s*(\d+)", text, re.I
            )
            height = re.search(r'"height"\s*:\s*(\d+)', text) or re.search(
                r"height\s*=\s*(\d+)", text, re.I
            )
            if width and height:
                return f"{width.group(1)}*{height.group(1)}"
        return ""
