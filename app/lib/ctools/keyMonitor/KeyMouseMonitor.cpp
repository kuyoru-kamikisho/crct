#include "KeyMouseMonitor.h"
#include <windows.h>
#include <string>
#include <map>
#include <atomic>

// 全局变量
static HHOOK g_keyboardHook = nullptr;
static HHOOK g_mouseHook = nullptr;
static std::atomic<bool> g_monitoring{ false };
static std::string g_lastEvent;

// 虚拟键码到字符串的映射
std::map<int, std::string> keyMap = {
    {VK_LBUTTON, "Left Mouse Button"},
    {VK_RBUTTON, "Right Mouse Button"},
    {VK_MBUTTON, "Middle Mouse Button"},
    {VK_XBUTTON1, "Mouse Button X1"},
    {VK_XBUTTON2, "Mouse Button X2"},
    {VK_BACK, "Backspace"},
    {VK_TAB, "Tab"},
    {VK_RETURN, "Enter"},
    {VK_SHIFT, "Shift"},
    {VK_CONTROL, "Ctrl"},
    {VK_MENU, "Alt"},
    {VK_PAUSE, "Pause"},
    {VK_CAPITAL, "Caps Lock"},
    {VK_ESCAPE, "Escape"},
    {VK_SPACE, "Space"},
    {VK_PRIOR, "Page Up"},
    {VK_NEXT, "Page Down"},
    {VK_END, "End"},
    {VK_HOME, "Home"},
    {VK_LEFT, "Left Arrow"},
    {VK_UP, "Up Arrow"},
    {VK_RIGHT, "Right Arrow"},
    {VK_DOWN, "Down Arrow"},
    {VK_INSERT, "Insert"},
    {VK_DELETE, "Delete"},
    {VK_LWIN, "Left Windows"},
    {VK_RWIN, "Right Windows"},
    {VK_NUMPAD0, "Numpad 0"},
    {VK_NUMPAD1, "Numpad 1"},
    {VK_NUMPAD2, "Numpad 2"},
    {VK_NUMPAD3, "Numpad 3"},
    {VK_NUMPAD4, "Numpad 4"},
    {VK_NUMPAD5, "Numpad 5"},
    {VK_NUMPAD6, "Numpad 6"},
    {VK_NUMPAD7, "Numpad 7"},
    {VK_NUMPAD8, "Numpad 8"},
    {VK_NUMPAD9, "Numpad 9"},
    {VK_MULTIPLY, "Numpad *"},
    {VK_ADD, "Numpad +"},
    {VK_SUBTRACT, "Numpad -"},
    {VK_DECIMAL, "Numpad ."},
    {VK_DIVIDE, "Numpad /"},
    {VK_F1, "F1"},
    {VK_F2, "F2"},
    {VK_F3, "F3"},
    {VK_F4, "F4"},
    {VK_F5, "F5"},
    {VK_F6, "F6"},
    {VK_F7, "F7"},
    {VK_F8, "F8"},
    {VK_F9, "F9"},
    {VK_F10, "F10"},
    {VK_F11, "F11"},
    {VK_F12, "F12"},
    {VK_NUMLOCK, "Num Lock"},
    {VK_SCROLL, "Scroll Lock"},
    {VK_LSHIFT, "Left Shift"},
    {VK_RSHIFT, "Right Shift"},
    {VK_LCONTROL, "Left Ctrl"},
    {VK_RCONTROL, "Right Ctrl"},
    {VK_LMENU, "Left Alt"},
    {VK_RMENU, "Right Alt"}
};

// 键盘钩子回调函数
LRESULT CALLBACK KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode >= 0 && g_monitoring) {
        KBDLLHOOKSTRUCT* kbStruct = (KBDLLHOOKSTRUCT*)lParam;

        if (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN) {
            int vkCode = kbStruct->vkCode;

            // 检查是否是字母或数字
            if ((vkCode >= 'A' && vkCode <= 'Z') ||
                (vkCode >= '0' && vkCode <= '9')) {
                g_lastEvent = std::string(1, static_cast<char>(vkCode));
            }
            else if (keyMap.find(vkCode) != keyMap.end()) {
                g_lastEvent = keyMap[vkCode];
            }
            else {
                g_lastEvent = "Key " + std::to_string(vkCode);
            }
        }
    }

    return CallNextHookEx(g_keyboardHook, nCode, wParam, lParam);
}

// 鼠标钩子回调函数
LRESULT CALLBACK MouseProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode >= 0 && g_monitoring) {
        MSLLHOOKSTRUCT* mouseStruct = (MSLLHOOKSTRUCT*)lParam;

        switch (wParam) {
        case WM_LBUTTONDOWN:
            g_lastEvent = "Left Mouse Button Down";
            break;
        case WM_LBUTTONUP:
            g_lastEvent = "Left Mouse Button Up";
            break;
        case WM_RBUTTONDOWN:
            g_lastEvent = "Right Mouse Button Down";
            break;
        case WM_RBUTTONUP:
            g_lastEvent = "Right Mouse Button Up";
            break;
        case WM_MBUTTONDOWN:
            g_lastEvent = "Middle Mouse Button Down";
            break;
        case WM_MBUTTONUP:
            g_lastEvent = "Middle Mouse Button Up";
            break;
        case WM_MOUSEWHEEL:
            g_lastEvent = "Mouse Wheel";
            break;
        case WM_MOUSEMOVE:
            // 鼠标移动事件太多，可以选择性忽略或特殊处理
            // g_lastEvent = "Mouse Move";
            break;
        }
    }

    return CallNextHookEx(g_mouseHook, nCode, wParam, lParam);
}

// 开始全局监听
bool runKeyMouseMonitor() {
    if (g_monitoring) {
        return true; // 已经在运行
    }

    // 设置键盘钩子
    g_keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, GetModuleHandle(NULL), 0);
    if (!g_keyboardHook) {
        return false;
    }

    // 设置鼠标钩子
    g_mouseHook = SetWindowsHookEx(WH_MOUSE_LL, MouseProc, GetModuleHandle(NULL), 0);
    if (!g_mouseHook) {
        UnhookWindowsHookEx(g_keyboardHook);
        g_keyboardHook = nullptr;
        return false;
    }

    g_monitoring = true;
    g_lastEvent = "Monitoring started";

    return true;
}

// 停止监听
void stopKeyMouseMonitor() {
    if (g_keyboardHook) {
        UnhookWindowsHookEx(g_keyboardHook);
        g_keyboardHook = nullptr;
    }

    if (g_mouseHook) {
        UnhookWindowsHookEx(g_mouseHook);
        g_mouseHook = nullptr;
    }

    g_monitoring = false;
    g_lastEvent = "Monitoring stopped";
}

// 获取最后的事件信息
const char* getLastEvent() {
    return g_lastEvent.c_str();
}