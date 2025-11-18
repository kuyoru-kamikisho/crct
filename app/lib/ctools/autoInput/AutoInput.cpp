#include "pch.h"
// AutoInput.cpp
#define BUILDING_AUTOINPUT
#include "AutoInput.h"
#include "../keyMonitor/DeviceEventsMap.h"
#include <string>
#include <map>
#include <algorithm>
#include <thread>
#include <chrono>

static std::map<std::string, int> g_stringToVk;
static bool g_mapsInitialized = false;

static void InitMapsIfNeeded()
{
    if (g_mapsInitialized) return;
    // DeviceEventsMap.h contains `std::map<int, std::string> keyMap`
    for (const auto& p : keyMap) {
        std::string name = p.second;
        // normalize to lowercase
        std::transform(name.begin(), name.end(), name.begin(), ::tolower);
        g_stringToVk[name] = p.first;
    }
    // also add single-letter keys normalized (if not already)
    for (char c = 'a'; c <= 'z'; ++c) {
        std::string s(1, c);
        if (g_stringToVk.find(s) == g_stringToVk.end()) {
            g_stringToVk[s] = VkKeyScanA((CHAR)c) & 0xFF; // fallback
        }
    }
    for (char c = '0'; c <= '9'; ++c) {
        std::string s(1, c);
        if (g_stringToVk.find(s) == g_stringToVk.end()) {
            g_stringToVk[s] = VkKeyScanA((CHAR)c) & 0xFF;
        }
    }
    g_mapsInitialized = true;
}

static int StringToVK(const std::string& raw)
{
    InitMapsIfNeeded();
    std::string s = raw;
    std::transform(s.begin(), s.end(), s.begin(), ::tolower);
    // trim
    while (!s.empty() && isspace(s.front())) s.erase(s.begin());
    while (!s.empty() && isspace(s.back())) s.pop_back();

    // direct lookup
    auto it = g_stringToVk.find(s);
    if (it != g_stringToVk.end()) return it->second;

    // if single character, try direct
    if (s.size() == 1) {
        char ch = s[0];
        SHORT vk = VkKeyScanA(ch);
        if (vk != -1) return vk & 0xFF;
    }

    return -1; // not found
}

static BOOL SendKey(WORD vk, bool down)
{
    INPUT input;
    ZeroMemory(&input, sizeof(input));
    input.type = INPUT_KEYBOARD;
    input.ki.wVk = vk;
    input.ki.wScan = 0;
    input.ki.time = 0;
    input.ki.dwFlags = down ? 0 : KEYEVENTF_KEYUP;
    UINT sent = SendInput(1, &input, sizeof(INPUT));
    return sent == 1;
}

AI_API BOOL KeyDown(const char* keyName, int durationMs)
{
    if (!keyName) return FALSE;
    int vk = StringToVK(keyName);
    if (vk == -1) return FALSE;

    if (!SendKey((WORD)vk, true)) return FALSE;

    // if duration > 0 spawn a detach thread to release after duration
    if (durationMs > 0) {
        std::string name(keyName);
        std::thread([vk, durationMs]() {
            std::this_thread::sleep_for(std::chrono::milliseconds(durationMs));
            SendKey((WORD)vk, false);
            }).detach();
    }
    return TRUE;
}

AI_API BOOL KeyUp(const char* keyName)
{
    if (!keyName) return FALSE;
    int vk = StringToVK(keyName);
    if (vk == -1) return FALSE;
    return SendKey((WORD)vk, false);
}

// Convert screen coords to absolute for SendInput (0..65535)
static LONG ScreenXToAbs(int x) {
    int w = GetSystemMetrics(SM_CXSCREEN);
    return (LONG)((x * 65535LL) / max(1, w));
}
static LONG ScreenYToAbs(int y) {
    int h = GetSystemMetrics(SM_CYSCREEN);
    return (LONG)((y * 65535LL) / max(1, h));
}

AI_API BOOL MouseMoveAt(int x, int y)
{
    // prefer SetCursorPos for immediate movement, then also send absolute input to be safe
    if (!SetCursorPos(x, y)) {
        // still attempt via SendInput
    }
    INPUT input;
    ZeroMemory(&input, sizeof(input));
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE;
    input.mi.dx = ScreenXToAbs(x);
    input.mi.dy = ScreenYToAbs(y);
    UINT sent = SendInput(1, &input, sizeof(INPUT));
    return sent == 1;
}

static BOOL MouseEventDownUp(DWORD downFlag, DWORD upFlag, int x, int y)
{
    if (!MouseMoveAt(x, y)) return FALSE;
    INPUT inputs[2];
    ZeroMemory(inputs, sizeof(inputs));
    inputs[0].type = INPUT_MOUSE;
    inputs[0].mi.dwFlags = downFlag;
    inputs[1].type = INPUT_MOUSE;
    inputs[1].mi.dwFlags = upFlag;
    UINT sent = SendInput(2, inputs, sizeof(INPUT));
    return sent == 2;
}

AI_API BOOL LeftClick(int x, int y)
{
    return MouseEventDownUp(MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, x, y);
}
AI_API BOOL RightClick(int x, int y)
{
    return MouseEventDownUp(MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, x, y);
}
AI_API BOOL MiddleClick(int x, int y)
{
    return MouseEventDownUp(MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, x, y);
}

AI_API BOOL LeftDown(int x, int y)
{
    if (!MouseMoveAt(x, y)) return FALSE;
    INPUT input;
    ZeroMemory(&input, sizeof(input));
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
    return SendInput(1, &input, sizeof(INPUT)) == 1;
}
AI_API BOOL LeftUp(int x, int y)
{
    if (x >= 0 && y >= 0) MouseMoveAt(x, y);
    INPUT input; ZeroMemory(&input, sizeof(input));
    input.type = INPUT_MOUSE; input.mi.dwFlags = MOUSEEVENTF_LEFTUP;
    return SendInput(1, &input, sizeof(INPUT)) == 1;
}
AI_API BOOL RightDown(int x, int y)
{
    if (!MouseMoveAt(x, y)) return FALSE;
    INPUT input; ZeroMemory(&input, sizeof(input));
    input.type = INPUT_MOUSE; input.mi.dwFlags = MOUSEEVENTF_RIGHTDOWN;
    return SendInput(1, &input, sizeof(INPUT)) == 1;
}
AI_API BOOL RightUp(int x, int y)
{
    if (x >= 0 && y >= 0) MouseMoveAt(x, y);
    INPUT input; ZeroMemory(&input, sizeof(input));
    input.type = INPUT_MOUSE; input.mi.dwFlags = MOUSEEVENTF_RIGHTUP;
    return SendInput(1, &input, sizeof(INPUT)) == 1;
}
AI_API BOOL MiddleDown(int x, int y)
{
    if (!MouseMoveAt(x, y)) return FALSE;
    INPUT input; ZeroMemory(&input, sizeof(input));
    input.type = INPUT_MOUSE; input.mi.dwFlags = MOUSEEVENTF_MIDDLEDOWN;
    return SendInput(1, &input, sizeof(INPUT)) == 1;
}
AI_API BOOL MiddleUp(int x, int y)
{
    if (x >= 0 && y >= 0) MouseMoveAt(x, y);
    INPUT input; ZeroMemory(&input, sizeof(input));
    input.type = INPUT_MOUSE; input.mi.dwFlags = MOUSEEVENTF_MIDDLEUP;
    return SendInput(1, &input, sizeof(INPUT)) == 1;
}

AI_API BOOL Scroll(const char* dir, int x, int y, int distance)
{
    if (!dir) return FALSE;
    std::string s(dir);
    std::transform(s.begin(), s.end(), s.begin(), ::tolower);
    if (!MouseMoveAt(x, y)) return FALSE;
    INPUT input; ZeroMemory(&input, sizeof(input));
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_WHEEL;
    // distance: number of wheel "notches" (WHEEL_DELTA == 120)
    int notches = distance;
    int delta = notches * WHEEL_DELTA;
    if (s == "down") delta = -abs(delta);
    else delta = abs(delta);
    input.mi.mouseData = delta;
    return SendInput(1, &input, sizeof(INPUT)) == 1;
}
