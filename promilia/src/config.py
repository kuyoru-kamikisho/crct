"""YAML 配置加载。"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from .paths import app_root, resolve_path


@dataclass
class AppTarget:
    package: str = ""
    name: str = ""


@dataclass
class EmulatorConfig:
    preferred: str = "雷电模拟器"
    ldplayer_index: int = 0
    startup_timeout: int = 120
    poll_interval: float = 2.0


@dataclass
class PathsConfig:
    cache_dir: str = "cache"
    screenshot_dir: str = "cache/screenshots"
    log_dir: str = "logs"


@dataclass
class LoggingConfig:
    level: str = "INFO"
    filename: str = "promilia.log"


@dataclass
class Config:
    app: AppTarget = field(default_factory=AppTarget)
    emulator: EmulatorConfig = field(default_factory=EmulatorConfig)
    paths: PathsConfig = field(default_factory=PathsConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    raw: dict[str, Any] = field(default_factory=dict, repr=False)

    @property
    def config_path(self) -> Path:
        return app_root() / "config.yaml"


def _section(data: dict[str, Any], key: str) -> dict[str, Any]:
    value = data.get(key) or {}
    return value if isinstance(value, dict) else {}


def load_config(path: Path | None = None) -> Config:
    """加载 YAML 配置；文件不存在时使用默认值。"""
    config_path = path or (app_root() / "config.yaml")
    data: dict[str, Any] = {}
    if config_path.exists():
        with config_path.open("r", encoding="utf-8") as fh:
            loaded = yaml.safe_load(fh) or {}
            if isinstance(loaded, dict):
                data = loaded

    app_sec = _section(data, "app")
    emu_sec = _section(data, "emulator")
    path_sec = _section(data, "paths")
    log_sec = _section(data, "logging")

    return Config(
        app=AppTarget(
            package=str(app_sec.get("package", "") or ""),
            name=str(app_sec.get("name", "") or ""),
        ),
        emulator=EmulatorConfig(
            preferred=str(emu_sec.get("preferred", "雷电模拟器") or "雷电模拟器"),
            ldplayer_index=int(emu_sec.get("ldplayer_index", 0) or 0),
            startup_timeout=int(emu_sec.get("startup_timeout", 120) or 120),
            poll_interval=float(emu_sec.get("poll_interval", 2) or 2),
        ),
        paths=PathsConfig(
            cache_dir=str(path_sec.get("cache_dir", "cache") or "cache"),
            screenshot_dir=str(
                path_sec.get("screenshot_dir", "cache/screenshots") or "cache/screenshots"
            ),
            log_dir=str(path_sec.get("log_dir", "logs") or "logs"),
        ),
        logging=LoggingConfig(
            level=str(log_sec.get("level", "INFO") or "INFO"),
            filename=str(log_sec.get("filename", "promilia.log") or "promilia.log"),
        ),
        raw=data,
    )


def config_log_file(cfg: Config) -> Path:
    return resolve_path(cfg.paths.log_dir) / cfg.logging.filename
