"""PC 系统信息采集。"""

from __future__ import annotations

import socket
from dataclasses import dataclass

import psutil


@dataclass
class MemoryInfo:
    total_gb: float
    available_gb: float
    used_percent: float


@dataclass
class NetworkInfo:
    connected: bool
    detail: str


def get_memory_info() -> MemoryInfo:
    mem = psutil.virtual_memory()
    return MemoryInfo(
        total_gb=round(mem.total / (1024**3), 2),
        available_gb=round(mem.available / (1024**3), 2),
        used_percent=mem.percent,
    )


def check_network(host: str = "223.5.5.5", port: int = 53, timeout: float = 2.0) -> NetworkInfo:
    """通过尝试连接公共 DNS 判断网络连通性。"""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return NetworkInfo(connected=True, detail=f"可连接 {host}:{port}")
    except OSError as exc:
        # 再试一次 HTTPS 出口
        try:
            with socket.create_connection(("www.baidu.com", 443), timeout=timeout):
                return NetworkInfo(connected=True, detail="可连接 www.baidu.com:443")
        except OSError:
            return NetworkInfo(connected=False, detail=str(exc))
