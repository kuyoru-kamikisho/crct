"""阶段一主流程。"""

from __future__ import annotations

import logging
import time
from datetime import datetime
from .config import Config, config_log_file, load_config
from .emulator.adb import AdbClient, InstalledApp
from .emulator.detector import EmulatorInfo, detect_emulators
from .emulator.ldplayer import LDPlayerController
from .logger import setup_logging
from .paths import ensure_dir
from .system_info import check_network, get_memory_info
from . import ui

logger = logging.getLogger("promilia.workflow")


INSTALL_HINTS = """
未检测到任何安卓模拟器。请先安装后再运行本程序。

推荐（国内常见）：
  - 雷电模拟器: https://www.ldmnq.com/
  - MuMu模拟器: https://mumu.163.com/
  - 夜神模拟器: https://www.yeshen.com/
  - 逍遥模拟器: https://www.xyaz.cn/
""".strip()


def _pick_emulator(emulators: list[EmulatorInfo], preferred: str) -> EmulatorInfo:
    if preferred:
        for emu in emulators:
            if preferred in emu.name or preferred.lower() in emu.brand:
                return emu
    # 优先雷电
    for emu in emulators:
        if emu.brand == "ldplayer":
            return emu
    return emulators[0]


def _print_emulator_list(emulators: list[EmulatorInfo]) -> None:
    ui.ok(f"共检测到 {len(emulators)} 个模拟器：")
    for i, emu in enumerate(emulators, 1):
        console = f", console={emu.console_path.name}" if emu.console_path else ""
        exe = f", exe={emu.exe_path.name}" if emu.exe_path else ""
        print(f"  {i}. {emu.name} | {emu.install_path}{exe}{console}")


def _print_apps(apps: list[InstalledApp], limit: int = 200) -> None:
    ui.ok(f"已安装应用（第三方优先）共 {len(apps)} 个：")
    print(f"  {'名称':<40} 包名")
    print("  " + "-" * 72)
    for app in apps[:limit]:
        name = (app.name or "-")[:40]
        print(f"  {name:<40} {app.package}")
    if len(apps) > limit:
        print(f"  ... 其余 {len(apps) - limit} 个已省略")


def _resolve_target_package(
    adb: AdbClient,
    cfg: Config,
    apps: list[InstalledApp],
) -> str | None:
    package = cfg.app.package.strip()
    name = cfg.app.name.strip()
    matched = adb.find_package_by_name_or_package(package, name, apps)
    if matched:
        return matched
    # 配置写的包名即使列表解析不到名称，也允许直接尝试启动
    if package:
        return package
    return None


def run_phase_one(cfg: Config | None = None) -> int:
    cfg = cfg or load_config()
    log_path = config_log_file(cfg)
    setup_logging(cfg.logging.level, log_path)
    ensure_dir(cfg.paths.cache_dir)
    ensure_dir(cfg.paths.screenshot_dir)

    ui.info(f"日志文件: {log_path}")
    logger.info("=== Promilia 阶段一启动 ===")

    # 1. 检测模拟器
    ui.info("正在扫描本机安卓模拟器...")
    emulators = detect_emulators()
    if not emulators:
        ui.error("未安装任何安卓模拟器")
        print(INSTALL_HINTS)
        logger.error("未检测到模拟器，退出")
        return 1

    _print_emulator_list(emulators)

    selected = _pick_emulator(emulators, cfg.emulator.preferred)
    ui.info(f"本次使用: {selected.name} ({selected.brand})")

    # 3. 以雷电为例；其他模拟器提示暂仅支持检测
    if selected.brand != "ldplayer":
        ui.warn(
            f"阶段一控制流程以雷电模拟器为例；当前选中 {selected.name}，"
            "仅完成检测。请在 config.yaml 中将 emulator.preferred 设为「雷电模拟器」。"
        )
        return 0

    try:
        controller = LDPlayerController(selected, index=cfg.emulator.ldplayer_index)
    except RuntimeError as exc:
        ui.error(str(exc))
        return 1

    # 3.1 检查是否已启动
    running = controller.is_running()
    if not running:
        ui.warn("雷电模拟器当前未启动")
        if not ui.ask_yes_no("是否现在启动模拟器？", default=True):
            ui.info("用户选择退出")
            return 0
        try:
            controller.launch()
        except Exception as exc:  # noqa: BLE001
            ui.error(f"启动失败: {exc}")
            logger.exception("启动雷电失败")
            return 1
    else:
        ui.ok("雷电模拟器已在运行")

    # 3.2 监听启动并通信
    ui.info("正在等待模拟器进入桌面（ADB 通信）...")
    ready = controller.wait_until_ready(
        timeout=cfg.emulator.startup_timeout,
        poll=cfg.emulator.poll_interval,
    )
    if not ready:
        ui.error("等待超时：未能确认模拟器已进入桌面")
        return 1
    ui.ok("模拟器已就绪")

    adb = controller.adb
    if not adb.serial:
        adb = controller.connect_adb()

    # 3.3 截图
    shot_name = f"desktop_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    shot_path = ensure_dir(cfg.paths.screenshot_dir) / shot_name
    try:
        adb.screenshot(shot_path)
        ui.ok(f"截图已保存: {shot_path}")
    except Exception as exc:  # noqa: BLE001
        ui.warn(f"截图失败: {exc}")
        logger.warning("截图失败", exc_info=True)

    # 3.4 应用列表
    ui.info("正在获取已安装应用列表...")
    try:
        apps = adb.list_installed_apps(with_names=True)
        _print_apps(apps)
    except Exception as exc:  # noqa: BLE001
        ui.warn(f"获取应用列表失败: {exc}")
        logger.warning("获取应用列表失败", exc_info=True)
        apps = []

    # 3.5 模拟器属性
    ui.info("正在获取模拟器设备信息...")
    try:
        props = adb.get_device_props()
        cfg_res = controller.get_resolution_from_config()
        resolution = props.resolution or cfg_res or "未知"
        print("  分辨率:", resolution)
        print("  机型:", props.model or "未知")
        print("  厂商:", props.manufacturer or "未知")
        print("  安卓版本:", props.android_version or "未知")
        print("  SDK:", props.sdk or "未知")
        if props.density:
            print("  屏幕密度:", props.density)
        ui.ok("设备信息已列出")
    except Exception as exc:  # noqa: BLE001
        ui.warn(f"获取设备信息失败: {exc}")
        logger.warning("获取设备信息失败", exc_info=True)

    # 3.6 PC 内存 / 网络
    mem = get_memory_info()
    net = check_network()
    print(
        f"  PC 内存: 总计 {mem.total_gb} GB / 可用 {mem.available_gb} GB / "
        f"已用 {mem.used_percent}%"
    )
    print(f"  网络连接: {'已连接' if net.connected else '未连接'} ({net.detail})")

    # 3.7 / 3.8 启动目标应用
    target = _resolve_target_package(adb, cfg, apps)
    if not target:
        ui.warn(
            "配置中的目标应用未找到，请检查 config.yaml 的 app.package / app.name"
        )
        return 0

    ui.info(f"尝试启动应用: {target}")
    started = False
    try:
        started = controller.launch_app_via_console(target)
    except Exception as exc:  # noqa: BLE001
        logger.debug("console runapp 失败: %s", exc)
    if not started:
        try:
            started = adb.start_app(target)
        except Exception as exc:  # noqa: BLE001
            ui.warn(f"启动应用失败: {exc}")
            logger.warning("启动应用失败", exc_info=True)

    time.sleep(3)
    running_app = False
    try:
        running_app = adb.is_app_running(target)
    except Exception as exc:  # noqa: BLE001
        logger.debug("检测应用状态失败: %s", exc)

    if running_app:
        ui.ok(f"应用已启动: {target}")
    elif started:
        ui.warn(f"已发送启动指令，但暂未检测到进程: {target}")
    else:
        ui.error(f"未能启动应用: {target}")
        return 1

    ui.ok("阶段一流程完成")
    logger.info("=== 阶段一完成 ===")
    return 0
