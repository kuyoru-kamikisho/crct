"""统一解析相对软件目录的路径。"""

from __future__ import annotations

from pathlib import Path


def app_root() -> Path:
    """返回软件/脚本所在根目录。"""
    return Path(__file__).resolve().parent.parent


def resolve_path(relative: str | Path) -> Path:
    """将相对路径解析到软件目录下。"""
    path = Path(relative)
    if path.is_absolute():
        return path
    return app_root() / path


def ensure_dir(relative: str | Path) -> Path:
    """确保目录存在并返回绝对路径。"""
    path = resolve_path(relative)
    path.mkdir(parents=True, exist_ok=True)
    return path
