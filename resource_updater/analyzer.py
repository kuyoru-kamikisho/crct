#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""内容变更分析器 —— 基于 Git 历史变更生成增量更新器。"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path, PurePosixPath
from typing import Iterable, List, Optional, Sequence, Tuple


# ---------------------------------------------------------------------------
# 终端样式
# ---------------------------------------------------------------------------

class Style:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    CYAN = "\033[36m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    MAGENTA = "\033[35m"
    BLUE = "\033[34m"
    WHITE = "\033[97m"


def _enable_windows_ansi() -> None:
    if sys.platform != "win32":
        return
    try:
        import ctypes

        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
        handle = kernel32.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            kernel32.SetConsoleMode(handle, mode.value | 0x0004)
    except Exception:
        pass


def c(text: str, *codes: str) -> str:
    if not sys.stdout.isatty():
        return text
    return f"{''.join(codes)}{text}{Style.RESET}"


def banner() -> None:
    line = "═" * 52
    print()
    print(c(line, Style.CYAN, Style.BOLD))
    print(c("  内容变更分析器", Style.CYAN, Style.BOLD))
    print(c("  基于 Git 历史变更，生成增量更新器程序", Style.DIM))
    print(c(line, Style.CYAN, Style.BOLD))
    print()


def info(msg: str) -> None:
    print(f"{c('[信息]', Style.BLUE, Style.BOLD)} {msg}")


def success(msg: str) -> None:
    print(f"{c('[成功]', Style.GREEN, Style.BOLD)} {msg}")


def warn(msg: str) -> None:
    print(f"{c('[警告]', Style.YELLOW, Style.BOLD)} {msg}")


def error(msg: str) -> None:
    print(f"{c('[错误]', Style.RED, Style.BOLD)} {msg}", file=sys.stderr)


def step(msg: str) -> None:
    print(f"{c('→', Style.MAGENTA, Style.BOLD)} {msg}")


# ---------------------------------------------------------------------------
# 数据模型
# ---------------------------------------------------------------------------

class ChangeType(Enum):
    ADDED = "A"
    MODIFIED = "M"
    DELETED = "D"
    RENAMED = "R"
    COPIED = "C"
    TYPE_CHANGED = "T"


STATUS_LABEL = {
    ChangeType.ADDED: ("新增", Style.GREEN),
    ChangeType.MODIFIED: ("修改", Style.YELLOW),
    ChangeType.DELETED: ("删除", Style.RED),
    ChangeType.RENAMED: ("重命名", Style.MAGENTA),
    ChangeType.COPIED: ("复制", Style.CYAN),
    ChangeType.TYPE_CHANGED: ("类型变更", Style.BLUE),
}


@dataclass
class FileChange:
    status: ChangeType
    path: str
    old_path: Optional[str] = None  # 重命名/复制时的旧路径


@dataclass
class DiffResult:
    old_commit: str
    new_commit: str
    old_short: str
    new_short: str
    changes: List[FileChange] = field(default_factory=list)

    @property
    def added(self) -> List[FileChange]:
        return [x for x in self.changes if x.status == ChangeType.ADDED]

    @property
    def modified(self) -> List[FileChange]:
        return [
            x
            for x in self.changes
            if x.status in (ChangeType.MODIFIED, ChangeType.TYPE_CHANGED)
        ]

    @property
    def deleted(self) -> List[FileChange]:
        items: List[FileChange] = []
        for x in self.changes:
            if x.status == ChangeType.DELETED:
                items.append(x)
            elif x.status == ChangeType.RENAMED and x.old_path:
                items.append(FileChange(ChangeType.DELETED, x.old_path))
        return items

    @property
    def to_copy(self) -> List[FileChange]:
        """需要复制到 update/ 的文件（新增、修改、重命名/复制后的新路径）。"""
        items: List[FileChange] = []
        for x in self.changes:
            if x.status in (
                ChangeType.ADDED,
                ChangeType.MODIFIED,
                ChangeType.TYPE_CHANGED,
                ChangeType.COPIED,
                ChangeType.RENAMED,
            ):
                items.append(x)
        return items


# ---------------------------------------------------------------------------
# Git 操作
# ---------------------------------------------------------------------------

class GitError(RuntimeError):
    pass


def run_git(args: Sequence[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess:
    cmd = ["git", *args]
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except FileNotFoundError as exc:
        raise GitError("未找到 git 命令，请先安装 Git 并确保其在 PATH 中。") from exc

    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise GitError(detail or f"git {' '.join(args)} 执行失败 (code={result.returncode})")
    return result


def ensure_git_repo(path: Path) -> Path:
    path = path.resolve()
    if not path.is_dir():
        raise GitError(f"目录不存在: {path}")
    result = run_git(["rev-parse", "--show-toplevel"], cwd=path)
    return Path(result.stdout.strip()).resolve()


def rev_parse(repo: Path, rev: str) -> str:
    result = run_git(["rev-parse", "--verify", f"{rev}^{{commit}}"], cwd=repo)
    return result.stdout.strip()


def short_hash(full: str) -> str:
    return full[:7]


def resolve_range(repo: Path, hashes: Optional[List[str]]) -> Tuple[str, str]:
    """返回 (old_commit, new_commit) 的完整哈希。"""
    head = rev_parse(repo, "HEAD")

    if not hashes:
        # 默认：上一提交 → 最新提交
        try:
            parent = rev_parse(repo, "HEAD~1")
        except GitError as exc:
            raise GitError("仓库至少需要 2 次提交才能进行默认比对。") from exc
        return parent, head

    if len(hashes) == 1:
        old = rev_parse(repo, hashes[0])
        return old, head

    if len(hashes) == 2:
        old = rev_parse(repo, hashes[0])
        new = rev_parse(repo, hashes[1])
        return old, new

    raise GitError("-hash 最多接受 2 个提交哈希值。")


def parse_name_status(line: str) -> Optional[FileChange]:
    line = line.strip("\0").strip()
    if not line:
        return None

    # --name-status -z 在重命名时输出: R100\0old\0new 或多字段
    # 非 -z 时: R100\told\tnew  或  M\tpath
    parts = line.split("\t")
    if len(parts) < 2:
        return None

    status_raw = parts[0].strip()
    code = status_raw[0].upper()

    try:
        status = ChangeType(code)
    except ValueError:
        # 忽略未识别状态（如 U 未合并）
        return None

    if status in (ChangeType.RENAMED, ChangeType.COPIED) and len(parts) >= 3:
        return FileChange(status=status, path=parts[2], old_path=parts[1])
    return FileChange(status=status, path=parts[1])


def get_diff(repo: Path, old: str, new: str) -> DiffResult:
    result = run_git(
        ["diff", "--name-status", "--find-renames", old, new],
        cwd=repo,
    )
    changes: List[FileChange] = []
    for line in result.stdout.splitlines():
        change = parse_name_status(line)
        if change:
            # 统一为正斜杠相对路径，便于跨平台脚本
            change.path = change.path.replace("\\", "/")
            if change.old_path:
                change.old_path = change.old_path.replace("\\", "/")
            changes.append(change)

    return DiffResult(
        old_commit=old,
        new_commit=new,
        old_short=short_hash(old),
        new_short=short_hash(new),
        changes=changes,
    )


def export_file_at_commit_binary(repo: Path, commit: str, rel_path: str, dest: Path) -> None:
    git_path = rel_path.replace("\\", "/")
    cmd = ["git", "show", f"{commit}:{git_path}"]
    try:
        result = subprocess.run(
            cmd,
            cwd=str(repo),
            capture_output=True,
            check=False,
        )
    except FileNotFoundError as exc:
        raise GitError("未找到 git 命令，请先安装 Git 并确保其在 PATH 中。") from exc

    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise GitError(detail or f"无法导出文件: {git_path}@{short_hash(commit)}")

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(result.stdout)


# ---------------------------------------------------------------------------
# 交互
# ---------------------------------------------------------------------------

def prompt_yes_no(message: str, default_yes: bool = True) -> bool:
    hint = "Y/n" if default_yes else "y/N"
    while True:
        try:
            raw = input(f"{c('?', Style.CYAN, Style.BOLD)} {message} ({hint}): ")
        except (EOFError, KeyboardInterrupt):
            print()
            return False
        raw = raw.replace("\ufeff", "").strip().strip("\"'")
        if raw == "":
            return default_yes
        low = raw.lower()
        if low in ("y", "yes", "是", "好", "ok"):
            return True
        if low in ("n", "no", "否", "取消"):
            return False
        warn("请输入 Y 或 N。")


def prompt_choice(message: str, options: Sequence[Tuple[str, str]]) -> str:
    """options: [(value, label), ...] 返回选中的 value。"""
    print(f"{c('?', Style.CYAN, Style.BOLD)} {message}")
    for idx, (_, label) in enumerate(options, start=1):
        print(f"    {c(f'[{idx}]', Style.BOLD)} {label}")
    while True:
        try:
            raw = input(f"  请输入选项 [1-{len(options)}]: ")
        except (EOFError, KeyboardInterrupt):
            print()
            raise SystemExit(1)
        raw = raw.replace("\ufeff", "").strip().strip("\"'")
        if raw.isdigit():
            n = int(raw)
            if 1 <= n <= len(options):
                return options[n - 1][0]
        for value, _label in options:
            if raw.lower() == value.lower():
                return value
        warn(f"无效选项，请输入 1-{len(options)}。")


def print_changes(diff: DiffResult) -> None:
    print()
    print(c("变更文件列表", Style.BOLD, Style.WHITE))
    print(c("─" * 52, Style.DIM))

    if not diff.changes:
        print(c("  （无变更文件）", Style.DIM))
        print()
        return

    width = max(len(STATUS_LABEL[ch.status][0]) for ch in diff.changes)
    for ch in diff.changes:
        label, color = STATUS_LABEL[ch.status]
        tag = f"[{label}]".ljust(width + 2)
        if ch.status == ChangeType.RENAMED and ch.old_path:
            print(f"  {c(tag, color, Style.BOLD)} {ch.old_path} → {ch.path}")
        else:
            print(f"  {c(tag, color, Style.BOLD)} {ch.path}")

    n_added = len(diff.added)
    n_modified = len(
        [
            x
            for x in diff.changes
            if x.status
            in (
                ChangeType.MODIFIED,
                ChangeType.TYPE_CHANGED,
                ChangeType.RENAMED,
                ChangeType.COPIED,
            )
        ]
    )
    n_deleted = len([x for x in diff.changes if x.status == ChangeType.DELETED])
    print(c("─" * 52, Style.DIM))
    print(
        f"  共 {c(str(len(diff.changes)), Style.BOLD)} 个变更"
        f"（新增 {c(str(n_added), Style.GREEN)}"
        f"，修改 {c(str(n_modified), Style.YELLOW)}"
        f"，删除 {c(str(n_deleted), Style.RED)}）"
    )
    print()


# ---------------------------------------------------------------------------
# 更新器生成
# ---------------------------------------------------------------------------

UPDATE_DIR_NAME = "update"
BASH_SCRIPT_NAME = "updater.sh"
CMD_SCRIPT_NAME = "updater.cmd"


def shell_single_quote(s: str) -> str:
    return "'" + s.replace("'", "'\"'\"'") + "'"


def cmd_escape(s: str) -> str:
    """用于写入 cmd 脚本中的路径字符串。"""
    return s.replace("%", "%%").replace('"', '""')


def build_bash_updater(deleted_paths: Iterable[str]) -> str:
    deleted_list = "\n".join(f"  {shell_single_quote(p)}" for p in deleted_paths)
    if not deleted_list:
        deleted_list = "  # （无删除文件）"

    return f"""#!/usr/bin/env bash
# 内容变更分析器生成的增量更新脚本
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
SCRIPT_NAME="$(basename "${{BASH_SOURCE[0]}}")"

# ---- 颜色 ----
if [[ -t 1 ]]; then
  C_INFO='\\033[34m'; C_OK='\\033[32m'; C_WARN='\\033[33m'; C_ERR='\\033[31m'; C_RST='\\033[0m'; C_BOLD='\\033[1m'
else
  C_INFO=''; C_OK=''; C_WARN=''; C_ERR=''; C_RST=''; C_BOLD=''
fi

info()  {{ echo -e "${{C_INFO}}[信息]${{C_RST}} $*"; }}
ok()    {{ echo -e "${{C_OK}}[成功]${{C_RST}} $*"; }}
warn()  {{ echo -e "${{C_WARN}}[警告]${{C_RST}} $*"; }}
err()   {{ echo -e "${{C_ERR}}[错误]${{C_RST}} $*" >&2; }}

normalize_path() {{
  local p="$1"
  # 去掉首尾空白与引号
  p="${{p#"${{p%%[![:space:]]*}}"}}"
  p="${{p%"${{p##*[![:space:]]}}"}}"
  p="${{p#\\"}}"; p="${{p%\\"}}"
  p="${{p#\\'}}"; p="${{p%\\'}}"
  # 反斜杠转正斜杠
  p="${{p//\\\\//}}"
  # 去掉末尾多余斜杠（保留根 "/"）
  if [[ "$p" != "/" ]]; then
    p="${{p%/}}"
  fi
  echo "$p"
}}

is_dangerous_path() {{
  local p
  p="$(normalize_path "$1")"
  local lower
  lower="$(printf '%s' "$p" | tr '[:upper:]' '[:lower:]')"

  case "$lower" in
    ""|"/"|"/."|"/.."|"/*") return 0 ;;
    /bin|/boot|/dev|/etc|/lib|/lib64|/proc|/root|/run|/sbin|/sys|/usr|/var) return 0 ;;
    /bin/*|/boot/*|/dev/*|/etc/*|/lib/*|/proc/*|/sbin/*|/sys/*) return 0 ;;
  esac

  # Windows 盘符根目录: C:/  C:\\  D:/
  if [[ "$lower" =~ ^[a-z]:/?$ ]]; then
    return 0
  fi
  # 过短路径视为危险
  if [[ ${{#p}} -lt 3 ]]; then
    return 0
  fi
  return 1
}}

join_path() {{
  local root="$1"
  local rel="$2"
  rel="${{rel#/}}"
  rel="${{rel#\\\\}}"
  echo "${{root%/}}/${{rel}}"
}}

echo
echo -e "${{C_BOLD}}════════════════════════════════════════════════════${{C_RST}}"
echo -e "${{C_BOLD}}  增量更新器${{C_RST}}"
echo -e "${{C_BOLD}}════════════════════════════════════════════════════${{C_RST}}"
echo

TARGET=""
while true; do
  read -r -p "请输入被更新资源的根目录的绝对路径: " TARGET
  TARGET="$(normalize_path "$TARGET")"
  if [[ -z "$TARGET" ]]; then
    warn "路径不能为空，请重新输入。"
    continue
  fi
  if is_dangerous_path "$TARGET"; then
    err "检测到危险目录（如 /、C:/ 等系统根目录），请输入正确的业务资源路径。"
    continue
  fi
  if [[ ! -d "$TARGET" ]]; then
    warn "目录不存在: $TARGET"
    read -r -p "是否创建该目录？(Y/n): " CREATE
    CREATE="${{CREATE:-Y}}"
    if [[ "$CREATE" =~ ^[Yy]$ ]]; then
      mkdir -p "$TARGET" || {{ err "无法创建目录"; continue; }}
    else
      continue
    fi
  fi
  break
done

info "目标目录: $TARGET"
info "更新包目录: $SCRIPT_DIR"

DELETED_FILES=(
{deleted_list}
)

if [[ ${{#DELETED_FILES[@]}} -gt 0 ]]; then
  step_del=0
  for rel in "${{DELETED_FILES[@]}}"; do
    [[ -z "$rel" || "$rel" == \#* ]] && continue
    abs="$(join_path "$TARGET" "$rel")"
    if [[ -e "$abs" || -L "$abs" ]]; then
      rm -rf -- "$abs"
      echo -e "  ${{C_ERR}}删除${{C_RST}} $rel"
      step_del=$((step_del + 1))
    else
      echo -e "  ${{C_WARN}}跳过${{C_RST}} $rel （目标中不存在）"
    fi
  done
  info "已处理删除项，实际删除 ${{step_del}} 个"
fi

info "正在复制更新文件（覆盖式静默更新）..."
# 复制 SCRIPT_DIR 下除本脚本外的所有内容到目标目录
shopt -s dotglob nullglob
copied=0
for item in "$SCRIPT_DIR"/*; do
  base="$(basename "$item")"
  if [[ "$base" == "$SCRIPT_NAME" ]]; then
    continue
  fi
  if [[ -d "$item" ]]; then
    mkdir -p "$TARGET/$base"
    cp -a "$item"/. "$TARGET/$base"/
  else
    cp -a "$item" "$TARGET/$base"
  fi
  echo -e "  ${{C_OK}}更新${{C_RST}} $base"
  copied=$((copied + 1))
done
shopt -u dotglob nullglob

ok "复制完成，共处理 ${{copied}} 项顶层内容"
echo
ok "程序结束"
echo
"""


def build_cmd_updater(deleted_paths: Iterable[str]) -> str:
    deleted = [p.replace("\\", "/") for p in deleted_paths]
    if deleted:
        deleted_block = "\r\n".join(
            f'  echo {cmd_escape(p)}>>"%TEMP_LIST%"' for p in deleted
        )
    else:
        deleted_block = "  rem no deleted files"

    # 注意:
    # 1) if (...) 代码块内的 echo 不能出现未转义的 )
    # 2) FOR 集合中不要写 /bin 这种以 / 开头的项
    # 3) if 比较以 / 开头的值时需加前缀，避免被当成开关
    return f"""@echo off
chcp 936 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM Incremental updater generated by content-change-analyzer

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=!SCRIPT_DIR:~0,-1!"
set "SCRIPT_NAME=%~nx0"

echo.
echo ==================================================
echo   Zeng Liang Geng Xin Qi / Incremental Updater
echo ==================================================
echo.

:INPUT_PATH
set "TARGET="
set /p "TARGET=请输入被更新资源的根目录的绝对路径: "
set "TARGET=!TARGET:"=!"
for /f "tokens=* delims= " %%A in ("!TARGET!") do set "TARGET=%%A"
if "!TARGET!"=="" (
  echo [警告] 路径不能为空，请重新输入。
  goto INPUT_PATH
)

set "NORM=!TARGET:\\=/!"
if not "x!NORM!"=="x/" if "!NORM:~-1!"=="/" set "NORM=!NORM:~0,-1!"

set "IS_DANGER=0"
if "!NORM!"=="" set "IS_DANGER=1"
if "x!NORM!"=="x/" set "IS_DANGER=1"
if "x!NORM!"=="x/." set "IS_DANGER=1"
if "x!NORM!"=="x/.." set "IS_DANGER=1"
if "!NORM:~1,1!"==":" if "x!NORM:~2!"=="x" set "IS_DANGER=1"
if "!NORM:~1,1!"==":" if "x!NORM:~2!"=="x/" set "IS_DANGER=1"
if "x!NORM:~2!"=="x" set "IS_DANGER=1"
for %%D in (bin boot dev etc lib proc root run sbin sys usr var) do (
  if /I "x!NORM!"=="x/%%D" set "IS_DANGER=1"
)

if "!IS_DANGER!"=="1" (
  echo [错误] 检测到危险目录，如系统根目录，请输入正确的业务资源路径。
  goto INPUT_PATH
)

set "TARGET=!NORM!"

if not exist "!TARGET!" (
  echo [警告] 目录不存在: !TARGET!
  set "CREATE=Y"
  set /p "CREATE=是否创建该目录？Y/n: "
  if /I "!CREATE!"=="N" goto INPUT_PATH
  mkdir "!TARGET!" 2>nul
  if not exist "!TARGET!" (
    echo [错误] 无法创建目录
    goto INPUT_PATH
  )
)

echo [信息] 目标目录: !TARGET!
echo [信息] 更新包目录: !SCRIPT_DIR!

REM Backslash form for delete/copy reliability on older Windows
set "TARGET_BS=!TARGET:/=\\!"

set "TEMP_LIST=%TEMP%\\updater_deleted_%RANDOM%.txt"
type nul > "%TEMP_LIST%"
{deleted_block}

set "DEL_COUNT=0"
for /f "usebackq delims=" %%F in ("%TEMP_LIST%") do (
  set "REL=%%F"
  set "REL_BS=!REL:/=\\!"
  set "ABS=!TARGET_BS!\\!REL_BS!"
  if exist "!ABS!" (
    del /f /q "!ABS!" >nul 2>&1
    if exist "!ABS!" rd /s /q "!ABS!" >nul 2>&1
    if exist "!ABS!" (
      echo   [跳过] %%F
    ) else (
      echo   [删除] %%F
      set /a DEL_COUNT+=1
    )
  ) else (
    echo   [跳过] %%F - 目标中不存在
  )
)
del /f /q "%TEMP_LIST%" >nul 2>&1
echo [信息] 已处理删除项，实际删除 !DEL_COUNT! 个

echo [信息] 正在复制更新文件，覆盖式静默更新...
set "COPY_COUNT=0"
for /f "delims=" %%I in ('dir /b /a "!SCRIPT_DIR!"') do (
  if /I not "%%I"=="!SCRIPT_NAME!" (
    set "SRC=!SCRIPT_DIR!\\%%I"
    set "DST=!TARGET_BS!\\%%I"
    if exist "!SRC!" (
      xcopy "!SRC!" "!DST!" /E /Y /I /Q /H /R >nul
      echo   [更新] %%I
      set /a COPY_COUNT+=1
    )
  )
)

echo [成功] 复制完成，共处理 !COPY_COUNT! 项顶层内容
echo.
echo [成功] 程序结束
echo.
endlocal
exit /b 0
"""


def prepare_update_dir(repo: Path) -> Path:
    update_dir = repo / UPDATE_DIR_NAME
    if update_dir.exists():
        try:
            shutil.rmtree(update_dir)
        except OSError:
            # Windows 下偶发文件占用：清空内容后复用目录
            for child in update_dir.iterdir():
                if child.is_dir():
                    shutil.rmtree(child, ignore_errors=True)
                else:
                    try:
                        child.unlink()
                    except OSError:
                        pass
    update_dir.mkdir(parents=True, exist_ok=True)
    return update_dir


def copy_changed_files(repo: Path, diff: DiffResult, update_dir: Path) -> int:
    count = 0
    for ch in diff.to_copy:
        dest = update_dir / Path(*PurePosixPath(ch.path).parts)
        step(f"复制 {ch.path}")
        try:
            export_file_at_commit_binary(repo, diff.new_commit, ch.path, dest)
            count += 1
        except GitError as exc:
            # 子模块或特殊路径可能失败
            warn(f"跳过 {ch.path}: {exc}")
    return count


def write_updater_script(update_dir: Path, kind: str, deleted_paths: Sequence[str]) -> Path:
    if kind == "bash":
        path = update_dir / BASH_SCRIPT_NAME
        content = build_bash_updater(deleted_paths)
        path.write_text(content, encoding="utf-8", newline="\n")
        try:
            os.chmod(path, 0o755)
        except OSError:
            pass
        return path

    path = update_dir / CMD_SCRIPT_NAME
    content = build_cmd_updater(deleted_paths)
    normalized = content.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\r\n")
    # 中文提示用 GBK；勿再 chcp 65001，否则会按 UTF-8 错读脚本
    path.write_bytes(normalized.encode("gbk", errors="replace"))
    return path


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------

def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="analyzer",
        description="内容变更分析器：分析 Git 提交变更并生成增量更新器程序。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""示例:
  python analyzer.py
  python analyzer.py D:\\projects\\app
  python analyzer.py -hash abc1234
  python analyzer.py -hash abc1234 def5678
  python analyzer.py D:\\projects\\app -hash abc1234 def5678
""",
    )
    parser.add_argument(
        "project",
        nargs="?",
        default=".",
        help="被分析的 Git 项目路径（默认当前目录）",
    )
    parser.add_argument(
        "-hash",
        "--hash",
        nargs="+",
        metavar="COMMIT",
        dest="hashes",
        help="指定比对提交：1 个=该提交..HEAD；2 个=旧提交..新提交",
    )
    return parser.parse_args(argv)


def _configure_stdio() -> None:
    """确保 Windows 控制台下中文与颜色正常显示。"""
    _enable_windows_ansi()
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        except Exception:
            pass


def is_working_tree_clean(repo: Path) -> bool:
    result = run_git(["status", "--porcelain"], cwd=repo)
    return result.stdout.strip() == ""


def checkout_commit(repo: Path, commit: str) -> None:
    """切换到指定提交（detached HEAD），用于双哈希比对场景。"""
    if not is_working_tree_clean(repo):
        raise GitError("工作区有未提交变更，无法切换提交。请先提交或暂存后再试。")
    run_git(["checkout", "--detach", commit], cwd=repo)
    info(f"已切换到提交 {c(short_hash(commit), Style.GREEN)} (detached HEAD)")


def main(argv: Optional[Sequence[str]] = None) -> int:
    _configure_stdio()
    args = parse_args(argv)
    banner()

    try:
        repo = ensure_git_repo(Path(args.project))
    except GitError as exc:
        error(str(exc))
        return 1

    info(f"分析仓库: {c(str(repo), Style.BOLD)}")

    try:
        old, new = resolve_range(repo, args.hashes)
    except GitError as exc:
        error(str(exc))
        return 1

    info(
        f"比对范围: {c(short_hash(old), Style.YELLOW)} → {c(short_hash(new), Style.GREEN)}"
        f"  {c(f'({old[:12]} .. {new[:12]})', Style.DIM)}"
    )

    # 两个哈希：切换到新版本提交后再比对
    if args.hashes and len(args.hashes) == 2:
        try:
            current = rev_parse(repo, "HEAD")
            if current != new:
                step(f"切换到新版本提交 {short_hash(new)} ...")
                checkout_commit(repo, new)
            else:
                info(f"当前已在目标提交 {c(short_hash(new), Style.GREEN)}")
        except GitError as exc:
            error(str(exc))
            return 1

    print()
    step("正在分析变更...")
    try:
        diff = get_diff(repo, old, new)
    except GitError as exc:
        error(str(exc))
        return 1

    print_changes(diff)

    if not diff.changes:
        warn("没有检测到文件变更，无需创建更新器。")
        return 0

    if not prompt_yes_no("是否需要根据变更内容创建更新器程序？", default_yes=True):
        info("已取消，程序退出。")
        return 0

    print()
    kind = prompt_choice(
        "请选择更新器程序的终端类型",
        [
            ("bash", f"bash  → 生成 {BASH_SCRIPT_NAME}"),
            ("cmd", f"cmd   → 生成 {CMD_SCRIPT_NAME}"),
        ],
    )
    print()

    step(f"准备输出目录 {UPDATE_DIR_NAME}/ ...")
    update_dir = prepare_update_dir(repo)

    step("复制新增/修改文件（保留相对路径）...")
    copied = copy_changed_files(repo, diff, update_dir)
    success(f"已复制 {copied} 个文件")

    deleted_paths = [ch.path for ch in diff.deleted]
    seen = set()
    unique_deleted: List[str] = []
    for p in deleted_paths:
        if p not in seen:
            seen.add(p)
            unique_deleted.append(p)

    if unique_deleted:
        info(f"已记录 {len(unique_deleted)} 个待删除文件")
        for p in unique_deleted:
            print(f"    {c('×', Style.RED)} {p}")
    else:
        info("无待删除文件")

    print()
    script_name = BASH_SCRIPT_NAME if kind == "bash" else CMD_SCRIPT_NAME
    step(f"生成更新器脚本 {script_name} ...")
    script_path = write_updater_script(update_dir, kind, unique_deleted)

    print()
    print(c("═" * 52, Style.GREEN, Style.BOLD))
    success("更新器程序创建完成！")
    info(f"输出目录: {c(str(update_dir), Style.BOLD)}")
    info(f"更新器脚本: {c(str(script_path), Style.BOLD)}")
    if kind == "bash":
        info(f"使用方式: cd update && bash {BASH_SCRIPT_NAME}")
    else:
        info(f"使用方式: cd update && {CMD_SCRIPT_NAME}")
    print(c("═" * 52, Style.GREEN, Style.BOLD))
    print()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        warn("用户中断，程序退出。")
        sys.exit(130)
