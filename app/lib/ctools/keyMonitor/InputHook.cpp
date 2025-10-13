#include "InputHook.h"
#include <windows.h>
#include <map>
#include <string>
#include <thread>
#include <atomic>
#include <sstream>

// 全局变量
static HHOOK g_keyboardHook = nullptr;
static HHOOK g_mouseHook = nullptr;
static EventCallback g_callback = nullptr;
static std::atomic<bool> g_isListening{ false };
static std::thread g_hookThread;

// 虚拟键码映射
std::map<int, std::string> keyMap = {
	// 字母键
	{0x41, "a"}, {0x42, "b"}, {0x43, "c"}, {0x44, "d"}, {0x45, "e"},
	{0x46, "f"}, {0x47, "g"}, {0x48, "h"}, {0x49, "i"}, {0x4A, "j"},
	{0x4B, "k"}, {0x4C, "l"}, {0x4D, "m"}, {0x4E, "n"}, {0x4F, "o"},
	{0x50, "p"}, {0x51, "q"}, {0x52, "r"}, {0x53, "s"}, {0x54, "t"},
	{0x55, "u"}, {0x56, "v"}, {0x57, "w"}, {0x58, "x"}, {0x59, "y"},
	{0x5A, "z"},

	// 数字键
	{0x30, "0"}, {0x31, "1"}, {0x32, "2"}, {0x33, "3"}, {0x34, "4"},
	{0x35, "5"}, {0x36, "6"}, {0x37, "7"}, {0x38, "8"}, {0x39, "9"},

	// 功能键 F1-F12
	{VK_F1, "f1"}, {VK_F2, "f2"}, {VK_F3, "f3"}, {VK_F4, "f4"},
	{VK_F5, "f5"}, {VK_F6, "f6"}, {VK_F7, "f7"}, {VK_F8, "f8"},
	{VK_F9, "f9"}, {VK_F10, "f10"}, {VK_F11, "f11"}, {VK_F12, "f12"},

	// 导航键
	{VK_RETURN, "enter"}, {VK_TAB, "tab"}, {VK_CAPITAL, "capslock"},
	{VK_SHIFT, "shift"}, {VK_CONTROL, "ctrl"}, {VK_MENU, "alt"},
	{VK_SPACE, "space"}, {VK_BACK, "backspace"}, {VK_DELETE, "delete"},
	{VK_INSERT, "insert"}, {VK_HOME, "home"}, {VK_END, "end"},
	{VK_PRIOR, "pageup"}, {VK_NEXT, "pagedown"},

	// 方向键
	{VK_UP, "up"}, {VK_DOWN, "down"}, {VK_LEFT, "left"}, {VK_RIGHT, "right"},

	// 符号键
	{VK_OEM_COMMA, ","}, {VK_OEM_PERIOD, "."}, {VK_OEM_2, "/"},
	{VK_OEM_1, ";"}, {VK_OEM_7, "\""}, {VK_OEM_4, "["}, {VK_OEM_6, "]"},
	{VK_OEM_5, "\\"}, {VK_OEM_MINUS, "-"}, {VK_OEM_PLUS, "="},
	{VK_OEM_3, "`"},

	// 数字小键盘
	{VK_NUMPAD0, "num0"}, {VK_NUMPAD1, "num1"}, {VK_NUMPAD2, "num2"},
	{VK_NUMPAD3, "num3"}, {VK_NUMPAD4, "num4"}, {VK_NUMPAD5, "num5"},
	{VK_NUMPAD6, "num6"}, {VK_NUMPAD7, "num7"}, {VK_NUMPAD8, "num8"},
	{VK_NUMPAD9, "num9"},
	{VK_NUMLOCK, "numlock"}, {VK_MULTIPLY, "num*"}, {VK_ADD, "num+"},
	{VK_SUBTRACT, "num-"}, {VK_DECIMAL, "num."}, {VK_DIVIDE, "num/"},

	// 其他特殊键
	{VK_ESCAPE, "esc"}, {VK_SNAPSHOT, "printscreen"}, {VK_SCROLL, "scrolllock"},
	{VK_PAUSE, "pause"}, {VK_LWIN, "win"}, {VK_APPS, "apps"}
};

// 鼠标按钮映射
std::map<int, std::string> mouseButtonMap = {
	{WM_LBUTTONDOWN, "leftclick"},
	{WM_LBUTTONUP, "leftclick"},
	{WM_RBUTTONDOWN, "rightclick"},
	{WM_RBUTTONUP, "rightclick"},
	{WM_MBUTTONDOWN, "middleclick"},
	{WM_MBUTTONUP, "middleclick"}
};

// 获取键名
std::string GetKeyName(int vkCode) {
	auto it = keyMap.find(vkCode);
	if (it != keyMap.end()) {
		return it->second;
	}

	// 对于未知键，返回十六进制代码
	char buffer[16];
	sprintf_s(buffer, "0x%02X", vkCode);
	return std::string(buffer);
}

// 获取鼠标按钮名
std::string GetMouseButtonName(int message) {
	auto it = mouseButtonMap.find(message);
	if (it != mouseButtonMap.end()) {
		return it->second;
	}
	return "unknown";
}

// 键盘钩子过程
LRESULT CALLBACK KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
	if (nCode >= 0 && g_callback != nullptr) {
		KBDLLHOOKSTRUCT* kbStruct = (KBDLLHOOKSTRUCT*)lParam;

		std::string eventType;
		if (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN) {
			eventType = "keydown";
		}
		else if (wParam == WM_KEYUP || wParam == WM_SYSKEYUP) {
			eventType = "keyup";
		}

		if (!eventType.empty()) {
			std::string keyName = GetKeyName(kbStruct->vkCode);
			std::string eventStr = eventType + " " + keyName;
			g_callback(eventStr.c_str());
		}
	}

	return CallNextHookEx(g_keyboardHook, nCode, wParam, lParam);
}

// 鼠标钩子过程
LRESULT CALLBACK MouseProc(int nCode, WPARAM wParam, LPARAM lParam) {
	if (nCode >= 0 && g_callback != nullptr) {
		MSLLHOOKSTRUCT* mouseStruct = (MSLLHOOKSTRUCT*)lParam;

		std::string eventType;
		if (wParam == WM_LBUTTONDOWN || wParam == WM_RBUTTONDOWN || wParam == WM_MBUTTONDOWN) {
			eventType = "mousedown";
		}
		else if (wParam == WM_LBUTTONUP || wParam == WM_RBUTTONUP || wParam == WM_MBUTTONUP) {
			eventType = "mouseup";
		}

		if (!eventType.empty()) {
			std::string buttonName = GetMouseButtonName(wParam);
			std::stringstream ss;
			ss << eventType << " " << buttonName << " " << mouseStruct->pt.x << "," << mouseStruct->pt.y;
			g_callback(ss.str().c_str());
		}
	}

	return CallNextHookEx(g_mouseHook, nCode, wParam, lParam);
}

// 钩子线程函数
void HookThread() {
	HINSTANCE hInstance = GetModuleHandle(NULL);

	// 安装键盘钩子
	g_keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, hInstance, 0);
	if (!g_keyboardHook) {
		return;
	}

	// 安装鼠标钩子
	g_mouseHook = SetWindowsHookEx(WH_MOUSE_LL, MouseProc, hInstance, 0);
	if (!g_mouseHook) {
		UnhookWindowsHookEx(g_keyboardHook);
		g_keyboardHook = nullptr;
		return;
	}

	// 消息循环
	MSG msg;
	while (g_isListening && GetMessage(&msg, NULL, 0, 0)) {
		TranslateMessage(&msg);
		DispatchMessage(&msg);
	}

	// 清理钩子
	if (g_keyboardHook) {
		UnhookWindowsHookEx(g_keyboardHook);
		g_keyboardHook = nullptr;
	}
	if (g_mouseHook) {
		UnhookWindowsHookEx(g_mouseHook);
		g_mouseHook = nullptr;
	}
}

// 导出函数实现
bool StartListening(EventCallback callback) {
	if (g_isListening) {
		return false; // 已经在监听
	}

	if (callback == nullptr) {
		return false; // 回调函数不能为空
	}

	g_callback = callback;
	g_isListening = true;

	// 在新线程中启动钩子
	g_hookThread = std::thread(HookThread);

	return true;
}

void StopListening() {
	if (!g_isListening) {
		return;
	}

	g_isListening = false;

	// 发送一个空消息来唤醒消息循环
	PostThreadMessage(GetThreadId(g_hookThread.native_handle()), WM_NULL, 0, 0);

	if (g_hookThread.joinable()) {
		g_hookThread.join();
	}

	g_callback = nullptr;
}

bool IsListening() {
	return g_isListening;
}