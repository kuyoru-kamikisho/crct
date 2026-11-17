#!/usr/bin/env python3
"""Promilia 入口：阶段一 - 模拟器检测与应用启动。"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def main() -> int:
    try:
        from src.workflow import run_phase_one
    except ImportError as exc:
        print(f"依赖缺失或模块导入失败: {exc}")
        print("请先执行: python -m pip install -r requirements.txt")
        return 1

    try:
        return run_phase_one()
    except KeyboardInterrupt:
        print("\n已取消")
        return 130


if __name__ == "__main__":
    sys.exit(main())
