"""友好交互提示。"""

from __future__ import annotations


def info(msg: str) -> None:
    print(f"[*] {msg}")


def ok(msg: str) -> None:
    print(f"[+] {msg}")


def warn(msg: str) -> None:
    print(f"[!] {msg}")


def error(msg: str) -> None:
    print(f"[-] {msg}")


def ask_yes_no(prompt: str, default: bool = True) -> bool:
    """询问是/否。默认值用括号提示。"""
    hint = "Y/n" if default else "y/N"
    while True:
        answer = input(f"{prompt} [{hint}]: ").strip().lower()
        if not answer:
            return default
        if answer in {"y", "yes", "是", "好", "启动"}:
            return True
        if answer in {"n", "no", "否", "退出"}:
            return False
        print("请输入 y/是 或 n/否")
