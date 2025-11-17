#include "InputHook.h"
#include <windows.h>
#include <map>
#include <string>
#include <thread>
#include <atomic>
#include <sstream>

// global variable
static HHOOK g_keyboardHook = nullptr;
static HHOOK g_mouseHook = nullptr;
static EventCallback g_callback = nullptr;
static std::atomic<bool> g_isListening{ false };
static std::thread g_hookThread;

// Virtual key code mapping
std::map<int, std::string> keyMap = {
	// Alphabet keys
	{0x41, "a"}, {0x42, "b"}, {0x43, "c"}, {0x44, "d"}, {0x45, "e"},
	{0x46, "f"}, {0x47, "g"}, {0x48, "h"}, {0x49, "i"}, {0x4A, "j"},
	{0x4B, "k"}, {0x4C, "l"}, {0x4D, "m"}, {0x4E, "n"}, {0x4F, "o"},
	{0x50, "p"}, {0x51, "q"}, {0x52, "r"}, {0x53, "s"}, {0x54, "t"},
	{0x55, "u"}, {0x56, "v"}, {0x57, "w"}, {0x58, "x"}, {0x59, "y"},
	{0x5A, "z"},

	// Number keys
	{0x30, "0"}, {0x31, "1"}, {0x32, "2"}, {0x33, "3"}, {0x34, "4"},
	{0x35, "5"}, {0x36, "6"}, {0x37, "7"}, {0x38, "8"}, {0x39, "9"},

	// function key F1-F12
	{VK_F1, "f1"}, {VK_F2, "f2"}, {VK_F3, "f3"}, {VK_F4, "f4"},
	{VK_F5, "f5"}, {VK_F6, "f6"}, {VK_F7, "f7"}, {VK_F8, "f8"},
	{VK_F9, "f9"}, {VK_F10, "f10"}, {VK_F11, "f11"}, {VK_F12, "f12"},

	// Navigation keys
	{VK_RETURN, "enter"}, {VK_TAB, "tab"}, {VK_CAPITAL, "capslock"},
	{VK_SHIFT, "shift"}, {VK_CONTROL, "ctrl"}, {VK_MENU, "alt"},
	{VK_SPACE, "space"}, {VK_BACK, "backspace"}, {VK_DELETE, "delete"},
	{VK_INSERT, "insert"}, {VK_HOME, "home"}, {VK_END, "end"},
	{VK_PRIOR, "pageup"}, {VK_NEXT, "pagedown"},
	{0xA0,"leftShift"},{0xA1,"rightShift"},
	{0xA2,"leftCtrl"},{0xA3,"rightCtrl"},
	{0xA4,"leftAlt"},{0xA5,"rightAlt"},

	// arrow keys
	{ VK_UP, "up" }, {VK_DOWN, "down"}, {VK_LEFT, "left"}, {VK_RIGHT, "right"},

	// Symbol key
	{VK_OEM_COMMA, ","}, {VK_OEM_PERIOD, "."}, {VK_OEM_2, "/"},
	{VK_OEM_1, ";"}, {VK_OEM_7, "\""}, {VK_OEM_4, "["}, {VK_OEM_6, "]"},
	{VK_OEM_5, "\\"}, {VK_OEM_MINUS, "-"}, {VK_OEM_PLUS, "="},
	{VK_OEM_3, "`"},

	// Numeric keypad
	{VK_NUMPAD0, "num0"}, {VK_NUMPAD1, "num1"}, {VK_NUMPAD2, "num2"},
	{VK_NUMPAD3, "num3"}, {VK_NUMPAD4, "num4"}, {VK_NUMPAD5, "num5"},
	{VK_NUMPAD6, "num6"}, {VK_NUMPAD7, "num7"}, {VK_NUMPAD8, "num8"},
	{VK_NUMPAD9, "num9"},
	{VK_NUMLOCK, "numlock"}, {VK_MULTIPLY, "num*"}, {VK_ADD, "num+"},
	{VK_SUBTRACT, "num-"}, {VK_DECIMAL, "num."}, {VK_DIVIDE, "num/"},

	// Other special keys
	{VK_ESCAPE, "esc"}, {VK_SNAPSHOT, "printscreen"}, {VK_SCROLL, "scrolllock"},
	{VK_PAUSE, "pause"}, {VK_LWIN, "win"}, {VK_APPS, "apps"}
};

// Mouse button mapping
std::map<int, std::string> mouseButtonMap = {
	{WM_LBUTTONDOWN, "leftclick"},
	{WM_LBUTTONUP, "leftclick"},
	{WM_RBUTTONDOWN, "rightclick"},
	{WM_RBUTTONUP, "rightclick"},
	{WM_MBUTTONDOWN, "middleclick"},
	{WM_MBUTTONUP, "middleclick"},
	{WM_XBUTTONDOWN, "xbutton"},
	{WM_XBUTTONUP, "xbutton"}
};

// Mouse wheel direction mapping
std::map<short, std::string> wheelDirectionMap = {
	{1, "up"},
	{-1, "down"}
};

// configuration options
static bool g_enableMouseMove = true;  // Do you want to enable mouse movement monitoring
static int g_mouseMoveThreshold = 5;   // Mouse movement report threshold (in pixels) to avoid overly frequent reports

// Get key names
std::string GetKeyName(int vkCode) {
	auto it = keyMap.find(vkCode);
	if (it != keyMap.end()) {
		return it->second;
	}

	// For unknown keys, return hexadecimal code
	char buffer[16];
	sprintf_s(buffer, "0x%02X", vkCode);
	return std::string(buffer);
}

// Get mouse button name
std::string GetMouseButtonName(int message) {
	auto it = mouseButtonMap.find(message);
	if (it != mouseButtonMap.end()) {
		return it->second;
	}
	return "unknown";
}

// Get the direction of the mouse wheel
std::string GetWheelDirection(short delta) {
	if (delta > 0) return "up";
	if (delta < 0) return "down";
	return "none";
}

// Keyboard Hook Process
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

// Mouse hook process
LRESULT CALLBACK MouseProc(int nCode, WPARAM wParam, LPARAM lParam) {
	if (nCode >= 0 && g_callback != nullptr) {
		MSLLHOOKSTRUCT* mouseStruct = (MSLLHOOKSTRUCT*)lParam;

		std::string eventType;
		std::stringstream ss;

		switch (wParam) {
		case WM_MOUSEMOVE:
			if (g_enableMouseMove) {
				// Report mouse movement events
				ss << "mousemove " << mouseStruct->pt.x << "," << mouseStruct->pt.y;
				g_callback(ss.str().c_str());
			}
			break;

		case WM_LBUTTONDOWN:
		case WM_RBUTTONDOWN:
		case WM_MBUTTONDOWN:
		case WM_XBUTTONDOWN:
			eventType = "mousedown";
			break;

		case WM_LBUTTONUP:
		case WM_RBUTTONUP:
		case WM_MBUTTONUP:
		case WM_XBUTTONUP:
			eventType = "mouseup";
			break;

		case WM_MOUSEWHEEL:
		{
			// Mouse Wheel Event
			int delta = GET_WHEEL_DELTA_WPARAM(mouseStruct->mouseData);
			std::string direction = GetWheelDirection(static_cast<short>(delta));
			ss << "mousewheel " << direction << " " << mouseStruct->pt.x << "," << mouseStruct->pt.y;
			g_callback(ss.str().c_str());
		}
		break;

		case WM_MOUSEHWHEEL:
		{
			// Mouse horizontal scroll wheel event
			int delta = GET_WHEEL_DELTA_WPARAM(mouseStruct->mouseData);
			std::string direction = GetWheelDirection(static_cast<short>(delta));
			ss << "mousehwheel " << direction << " " << mouseStruct->pt.x << "," << mouseStruct->pt.y;
			g_callback(ss.str().c_str());
		}
		break;
		}

		// Handling mouse button events
		if (!eventType.empty()) {
			std::string buttonName = GetMouseButtonName(wParam);
			ss.str(""); // clear stringstream
			ss << eventType << " " << buttonName << " " << mouseStruct->pt.x << "," << mouseStruct->pt.y;
			g_callback(ss.str().c_str());
		}
	}

	return CallNextHookEx(g_mouseHook, nCode, wParam, lParam);
}

// Hook thread function
void HookThread() {
	HINSTANCE hInstance = GetModuleHandle(NULL);

	// Install keyboard hook
	g_keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, hInstance, 0);
	if (!g_keyboardHook) {
		return;
	}

	// Install mouse hook
	g_mouseHook = SetWindowsHookEx(WH_MOUSE_LL, MouseProc, hInstance, 0);
	if (!g_mouseHook) {
		UnhookWindowsHookEx(g_keyboardHook);
		g_keyboardHook = nullptr;
		return;
	}

	// Message loop
	MSG msg;
	while (g_isListening && GetMessage(&msg, NULL, 0, 0)) {
		TranslateMessage(&msg);
		DispatchMessage(&msg);
	}

	// Clean the hook
	if (g_keyboardHook) {
		UnhookWindowsHookEx(g_keyboardHook);
		g_keyboardHook = nullptr;
	}
	if (g_mouseHook) {
		UnhookWindowsHookEx(g_mouseHook);
		g_mouseHook = nullptr;
	}
}

// Export function implementation
bool StartListening(EventCallback callback) {
	if (g_isListening) {
		return false; // Already monitoring
	}

	if (callback == nullptr) {
		return false; // The callback function cannot be empty
	}

	g_callback = callback;
	g_isListening = true;

	// Start the hook in a new thread
	g_hookThread = std::thread(HookThread);

	return true;
}

void StopListening() {
	if (!g_isListening) {
		return;
	}

	g_isListening = false;

	// Send an empty message to wake up the message loop
	if (g_hookThread.joinable()) {
		DWORD threadId = GetThreadId(g_hookThread.native_handle());
		if (threadId != 0) {
			PostThreadMessage(threadId, WM_NULL, 0, 0);
		}
	}

	if (g_hookThread.joinable()) {
		g_hookThread.join();
	}

	g_callback = nullptr;
}

bool IsListening() {
	return g_isListening;
}