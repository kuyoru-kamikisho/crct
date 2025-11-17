#include "InputHook.h"
#include "DeviceEventsMap.h"
#include <windows.h>
#include <map>
#include <string>
#include <thread>
#include <atomic>
#include <sstream>
#include <iomanip>

// global variable
static HHOOK g_keyboardHook = nullptr;
static HHOOK g_mouseHook = nullptr;
static EventCallback g_callback = nullptr;
static std::atomic<bool> g_isListening{ false };
static std::thread g_hookThread;

std::string GetTimestamp() {
	using namespace std::chrono;
	auto now = system_clock::now();
	time_t t = system_clock::to_time_t(now);
	struct tm localTime;
	localtime_s(&localTime, &t);

	std::ostringstream oss;
	oss << std::put_time(&localTime, "%H:%M:%S");
	return oss.str();
}

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
			std::string timestamp = GetTimestamp();
			g_callback((timestamp + " " + eventStr).c_str());
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
				std::string timestamp = GetTimestamp();
				g_callback((timestamp + " " + ss.str()).c_str());
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
			std::string timestamp = GetTimestamp();
			g_callback((timestamp + " " + ss.str()).c_str());
		}
		break;

		case WM_MOUSEHWHEEL:
		{
			// Mouse horizontal scroll wheel event
			int delta = GET_WHEEL_DELTA_WPARAM(mouseStruct->mouseData);
			std::string direction = GetWheelDirection(static_cast<short>(delta));
			ss << "mousehwheel " << direction << " " << mouseStruct->pt.x << "," << mouseStruct->pt.y;
			std::string timestamp = GetTimestamp();
			g_callback((timestamp + " " + ss.str()).c_str());
		}
		break;
		}

		// Handling mouse button events
		if (!eventType.empty()) {
			std::string buttonName = GetMouseButtonName(wParam);
			ss.str(""); // clear stringstream
			ss << eventType << " " << buttonName << " " << mouseStruct->pt.x << "," << mouseStruct->pt.y;
			std::string timestamp = GetTimestamp();
			g_callback((timestamp + " " + ss.str()).c_str());
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