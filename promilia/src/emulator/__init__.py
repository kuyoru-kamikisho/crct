"""模拟器检测与控制。"""

from .detector import EmulatorInfo, detect_emulators
from .ldplayer import LDPlayerController

__all__ = ["EmulatorInfo", "detect_emulators", "LDPlayerController"]
