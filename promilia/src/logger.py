"""日志初始化。"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

from .paths import ensure_dir


def setup_logging(level: str = "INFO", log_file: Path | None = None) -> logging.Logger:
    """配置控制台 + 文件双通道日志。"""
    logger = logging.getLogger("promilia")
    if logger.handlers:
        return logger

    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    logger.addHandler(console)

    if log_file is not None:
        ensure_dir(log_file.parent)
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger
