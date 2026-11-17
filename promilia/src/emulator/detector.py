"""检测本机已安装的常见安卓模拟器。"""

from __future__ import annotations

import logging
import os
import winreg
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger("promilia.emulator.detector")


@dataclass
class EmulatorInfo:
    name: str
    brand: str
    install_path: Path
    exe_path: Path | None = None
    console_path: Path | None = None
    version: str = ""
    extras: dict[str, str] = field(default_factory=dict)

    def display(self) -> str:
        ver = f" (v{self.version})" if self.version else ""
        return f"{self.name}{ver} @ {self.install_path}"


# 常见安装目录候选
_PROGRAM_FILES = [
    Path(os.environ.get("ProgramFiles", r"C:\Program Files")),
    Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")),
    Path(os.environ.get("LOCALAPPDATA", "")),
    Path(os.environ.get("USERPROFILE", "")),
    Path(r"C:\LDPlayer"),
    Path(r"D:\LDPlayer"),
    Path(r"E:\LDPlayer"),
    Path(r"C:\leidian"),
    Path(r"D:\leidian"),
    Path(r"E:\leidian"),
    Path(r"D:\Program Files"),
    Path(r"D:\Program Files (x86)"),
    Path(r"E:\Program Files"),
    Path(r"E:\Program Files (x86)"),
]


def _exists_file(path: Path | None) -> bool:
    return bool(path and path.is_file())


def _first_existing(candidates: list[Path]) -> Path | None:
    for path in candidates:
        if path.is_file():
            return path
    return None


def _dir_candidates(relative_parts: list[str]) -> list[Path]:
    results: list[Path] = []
    for root in _PROGRAM_FILES:
        if not root or not str(root):
            continue
        for part in relative_parts:
            results.append(root / part)
    return results


def _read_reg_install_path(hive: int, key_path: str, value_names: list[str]) -> Path | None:
    try:
        with winreg.OpenKey(hive, key_path) as key:
            for name in value_names:
                try:
                    value, _ = winreg.QueryValueEx(key, name)
                    if value:
                        path = Path(str(value))
                        if path.exists():
                            return path if path.is_dir() else path.parent
                except OSError:
                    continue
    except OSError:
        return None
    return None


def _detect_ldplayer() -> list[EmulatorInfo]:
    found: list[EmulatorInfo] = []
    reg_paths = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\XuanZhi\LDPlayer9"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\XuanZhi\LDPlayer"),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\XuanZhi\LDPlayer9"),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\XuanZhi\LDPlayer"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\XuanZhi\LDPlayer9"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\XuanZhi\LDPlayer"),
    ]
    install_dirs: set[Path] = set()
    for hive, key in reg_paths:
        path = _read_reg_install_path(hive, key, ["InstallDir", "InstallPath", "Path"])
        if path:
            install_dirs.add(path.resolve())

    for candidate in _dir_candidates(
        [
            "LDPlayer",
            "LDPlayer9",
            "ldplayer9box",
            "ChangZhi\\LDPlayer9",
            "leidian\\LDPlayer9",
            "leidian\\LDPlayer",
        ]
    ):
        if candidate.is_dir():
            install_dirs.add(candidate.resolve())

    for install in sorted(install_dirs):
        console = _first_existing(
            [
                install / "ldconsole.exe",
                install / "dnconsole.exe",
                install / "console" / "ldconsole.exe",
            ]
        )
        exe = _first_existing(
            [
                install / "dnplayer.exe",
                install / "LDPlayer.exe",
                install / "ldplayer.exe",
            ]
        )
        if not console and not exe:
            continue
        found.append(
            EmulatorInfo(
                name="雷电模拟器",
                brand="ldplayer",
                install_path=install,
                exe_path=exe,
                console_path=console,
            )
        )
    return found


def _detect_mumu() -> list[EmulatorInfo]:
    found: list[EmulatorInfo] = []
    install_dirs: set[Path] = set()

    reg_paths = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Netease\MuMuPlayer"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Netease\MuMuPlayer-12.0"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Netease\MuMuNxDevice"),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Netease\MuMuPlayer"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Netease\MuMuPlayer"),
    ]
    for hive, key in reg_paths:
        path = _read_reg_install_path(
            hive, key, ["InstallDir", "InstallPath", "DisplayIcon"]
        )
        if path:
            install_dirs.add(path.resolve())

    for candidate in _dir_candidates(
        [
            "Netease\\MuMu",
            "Netease\\MuMu Player 12",
            "MuMuPlayer",
            "MuMuPlayer-12.0",
            "MuMuNxDevice",
        ]
    ):
        if candidate.is_dir():
            install_dirs.add(candidate.resolve())

    for install in sorted(install_dirs):
        exe = _first_existing(
            [
                install / "MuMuManager.exe",
                install / "MuMuPlayer.exe",
                install / "nx_main" / "MuMuNxMain.exe",
                install / "shell" / "MuMuPlayer.exe",
                install / "MuMuNxMain.exe",
            ]
        )
        if not exe:
            # 再向下搜一层常见可执行文件
            for pattern in ("MuMuManager.exe", "MuMuNxMain.exe", "MuMuPlayer.exe"):
                matches = list(install.rglob(pattern))
                if matches:
                    exe = matches[0]
                    break
        if not exe:
            continue
        found.append(
            EmulatorInfo(
                name="MuMu模拟器",
                brand="mumu",
                install_path=install,
                exe_path=exe,
            )
        )
    return found


def _detect_nox() -> list[EmulatorInfo]:
    found: list[EmulatorInfo] = []
    install_dirs: set[Path] = set()
    for hive, key in [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Nox\Nox"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Nox\Nox"),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Nox\Nox"),
    ]:
        path = _read_reg_install_path(hive, key, ["Path", "InstallDir"])
        if path:
            install_dirs.add(path.resolve())

    for candidate in _dir_candidates(["Nox", "Nox\\bin"]):
        base = candidate if candidate.name != "bin" else candidate.parent
        if base.is_dir():
            install_dirs.add(base.resolve())

    for install in sorted(install_dirs):
        exe = _first_existing(
            [
                install / "bin" / "Nox.exe",
                install / "Nox.exe",
            ]
        )
        console = _first_existing(
            [
                install / "bin" / "NoxConsole.exe",
                install / "NoxConsole.exe",
            ]
        )
        if not exe and not console:
            continue
        found.append(
            EmulatorInfo(
                name="夜神模拟器",
                brand="nox",
                install_path=install,
                exe_path=exe,
                console_path=console,
            )
        )
    return found


def _detect_memu() -> list[EmulatorInfo]:
    found: list[EmulatorInfo] = []
    install_dirs: set[Path] = set()
    for hive, key in [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microvirt\MEmu"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microvirt\MEmu"),
    ]:
        path = _read_reg_install_path(hive, key, ["InstallDir", "Path"])
        if path:
            install_dirs.add(path.resolve())

    for candidate in _dir_candidates(["Microvirt\\MEmu", "MEmu"]):
        if candidate.is_dir():
            install_dirs.add(candidate.resolve())

    for install in sorted(install_dirs):
        exe = _first_existing([install / "MEmu.exe", install / "MEmuConsole.exe"])
        console = _first_existing([install / "memuc.exe", install / "MEmuConsole.exe"])
        if not exe and not console:
            continue
        found.append(
            EmulatorInfo(
                name="逍遥模拟器",
                brand="memu",
                install_path=install,
                exe_path=exe,
                console_path=console,
            )
        )
    return found


def _detect_bluestacks() -> list[EmulatorInfo]:
    found: list[EmulatorInfo] = []
    install_dirs: set[Path] = set()
    for hive, key in [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\BlueStacks_nxt"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\BlueStacks"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\BlueStacks_nxt"),
    ]:
        path = _read_reg_install_path(
            hive, key, ["InstallDir", "UserDefinedDir", "DataDir"]
        )
        if path:
            install_dirs.add(path.resolve())

    for candidate in _dir_candidates(
        ["BlueStacks_nxt", "BlueStacks", "BlueStacks International Ltd\\BlueStacks"]
    ):
        if candidate.is_dir():
            install_dirs.add(candidate.resolve())

    for install in sorted(install_dirs):
        exe = _first_existing(
            [
                install / "HD-Player.exe",
                install / "Bluestacks.exe",
            ]
        )
        if not exe:
            continue
        found.append(
            EmulatorInfo(
                name="BlueStacks",
                brand="bluestacks",
                install_path=install,
                exe_path=exe,
            )
        )
    return found


def _detect_gameloop() -> list[EmulatorInfo]:
    found: list[EmulatorInfo] = []
    install_dirs: set[Path] = set()
    for candidate in _dir_candidates(
        ["TxGameAssistant\\ui", "TxGameAssistant", "GameLoop"]
    ):
        if candidate.is_dir():
            install_dirs.add(candidate.resolve())

    for install in sorted(install_dirs):
        exe = _first_existing(
            [
                install / "AndroidEmulatorEn.exe",
                install / "AndroidEmulator.exe",
                install / "GameLoop.exe",
                install.parent / "ui" / "AndroidEmulatorEn.exe",
            ]
        )
        if not exe:
            matches = list(install.rglob("AndroidEmulator*.exe"))
            exe = matches[0] if matches else None
        if not exe:
            continue
        found.append(
            EmulatorInfo(
                name="腾讯手游助手/GameLoop",
                brand="gameloop",
                install_path=install,
                exe_path=exe,
            )
        )
    return found


def detect_emulators() -> list[EmulatorInfo]:
    """扫描本机已安装的安卓模拟器并去重。"""
    detectors = [
        _detect_ldplayer,
        _detect_mumu,
        _detect_nox,
        _detect_memu,
        _detect_bluestacks,
        _detect_gameloop,
    ]
    results: list[EmulatorInfo] = []
    seen: set[tuple[str, str]] = set()
    for detect in detectors:
        try:
            items = detect()
        except Exception as exc:  # noqa: BLE001 - 检测容错
            logger.warning("检测模拟器时出错: %s", exc)
            continue
        for item in items:
            key = (item.brand, str(item.install_path).lower())
            if key in seen:
                continue
            if not item.install_path.exists():
                continue
            if not (_exists_file(item.exe_path) or _exists_file(item.console_path)):
                continue
            seen.add(key)
            results.append(item)
            logger.info("发现模拟器: %s", item.display())
    return results
