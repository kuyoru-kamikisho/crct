#include "KeyMouseDll.h"
#include <map>
#include <thread>
#include <chrono>

// 虚拟键码映射
std::map<char, int> keyMap = {
    {'a', 0x41}, {'b', 0x42}, {'c', 0x43}, {'d', 0x44}, {'e', 0x45},
    {'f', 0x46}, {'g', 0x47}, {'h', 0x48}, {'i', 0x49}, {'j', 0x4A},
    {'k', 0x4B}, {'l', 0x4C}, {'m', 0x4D}, {'n', 0x4E}, {'o', 0x4F},
    {'p', 0x50}, {'q', 0x51}, {'r', 0x52}, {'s', 0x53}, {'t', 0x54},
    {'u', 0x55}, {'v', 0x56}, {'w', 0x57}, {'x', 0x58}, {'y', 0x59},
    {'z', 0x5A},
    {'0', 0x30}, {'1', 0x31}, {'2', 0x32}, {'3', 0x33}, {'4', 0x34},
    {'5', 0x35}, {'6', 0x36}, {'7', 0x37}, {'8', 0x38}, {'9', 0x39},
    {' ', VK_SPACE}, {',', VK_OEM_COMMA}, {'.', VK_OEM_PERIOD},
    {'/', VK_OEM_2}, {';', VK_OEM_1}, {'\'', VK_OEM_7},
    {'[', VK_OEM_4}, {']', VK_OEM_6}, {'\\', VK_OEM_5}
};

// ==================== KeyEvent 实现 ====================

void KeyEvent::pressKey(char key) {
    int vk = toupper(key);
    if (keyMap.find(tolower(key)) != keyMap.end()) {
        vk = keyMap[tolower(key)];
    }

    keyDown(vk);
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    keyUp(vk);
}

void KeyEvent::pressKey(int virtualKey) {
    keyDown(virtualKey);
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    keyUp(virtualKey);
}

void KeyEvent::keyDown(char key) {
    int vk = toupper(key);
    if (keyMap.find(tolower(key)) != keyMap.end()) {
        vk = keyMap[tolower(key)];
    }
    keyDown(vk);
}

void KeyEvent::keyDown(int virtualKey) {
    INPUT input = { 0 };
    input.type = INPUT_KEYBOARD;
    input.ki.wVk = virtualKey;
    input.ki.dwFlags = 0;
    SendInput(1, &input, sizeof(INPUT));
}

void KeyEvent::keyUp(char key) {
    int vk = toupper(key);
    if (keyMap.find(tolower(key)) != keyMap.end()) {
        vk = keyMap[tolower(key)];
    }
    keyUp(vk);
}

void KeyEvent::keyUp(int virtualKey) {
    INPUT input = { 0 };
    input.type = INPUT_KEYBOARD;
    input.ki.wVk = virtualKey;
    input.ki.dwFlags = KEYEVENTF_KEYUP;
    SendInput(1, &input, sizeof(INPUT));
}

void KeyEvent::pressEnter() {
    pressKey(VK_RETURN);
}

void KeyEvent::pressTab() {
    pressKey(VK_TAB);
}

void KeyEvent::pressSpace() {
    pressKey(VK_SPACE);
}

void KeyEvent::pressBackspace() {
    pressKey(VK_BACK);
}

void KeyEvent::pressEscape() {
    pressKey(VK_ESCAPE);
}

void KeyEvent::pressCtrlC() {
    keyDown(VK_CONTROL);
    pressKey('C');
    keyUp(VK_CONTROL);
}

void KeyEvent::pressCtrlV() {
    keyDown(VK_CONTROL);
    pressKey('V');
    keyUp(VK_CONTROL);
}

void KeyEvent::pressCtrlA() {
    keyDown(VK_CONTROL);
    pressKey('A');
    keyUp(VK_CONTROL);
}

void KeyEvent::pressCtrlO() {
    keyDown(VK_CONTROL);
    pressKey('O');
    keyUp(VK_CONTROL);
}

void KeyEvent::pressAltF4() {
    keyDown(VK_MENU);
    keyDown(VK_F4);
    keyUp(VK_F4);
    keyUp(VK_MENU);
}

void KeyEvent::pressCombination(const std::string& keys) {
    // 简单实现，支持 + 分隔的组合键，如 "ctrl+shift+a"
    // 实际使用时可以扩展更复杂的解析逻辑
    if (keys.find("ctrl+") != std::string::npos) {
        // 简化处理
        if (keys == "ctrl+c") pressCtrlC();
        else if (keys == "ctrl+v") pressCtrlV();
        else if (keys == "ctrl+a") pressCtrlA();
        else if (keys == "ctrl+o") pressCtrlO();
    }
}

void KeyEvent::holdKey(char key, DWORD durationMs) {
    keyDown(key);
    std::this_thread::sleep_for(std::chrono::milliseconds(durationMs));
    keyUp(key);
}

void KeyEvent::holdKey(int virtualKey, DWORD durationMs) {
    keyDown(virtualKey);
    std::this_thread::sleep_for(std::chrono::milliseconds(durationMs));
    keyUp(virtualKey);
}

void KeyEvent::typeText(const std::string& text) {
    for (char c : text) {
        pressKey(c);
        std::this_thread::sleep_for(std::chrono::milliseconds(30));
    }
}

bool KeyEvent::isKeyPressed(int virtualKey) {
    return (GetAsyncKeyState(virtualKey) & 0x8000) != 0;
}

// ==================== MouseEvent 实现 ====================

void MouseEvent::leftClick() {
    leftDown();
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    leftUp();
}

void MouseEvent::rightClick() {
    rightDown();
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    rightUp();
}

void MouseEvent::middleClick() {
    middleDown();
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    middleUp();
}

void MouseEvent::doubleClick() {
    leftClick();
    std::this_thread::sleep_for(std::chrono::milliseconds(150));
    leftClick();
}

void MouseEvent::leftDown() {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
    SendInput(1, &input, sizeof(INPUT));
}

void MouseEvent::leftUp() {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_LEFTUP;
    SendInput(1, &input, sizeof(INPUT));
}

void MouseEvent::rightDown() {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_RIGHTDOWN;
    SendInput(1, &input, sizeof(INPUT));
}

void MouseEvent::rightUp() {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_RIGHTUP;
    SendInput(1, &input, sizeof(INPUT));
}

void MouseEvent::middleDown() {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_MIDDLEDOWN;
    SendInput(1, &input, sizeof(INPUT));
}

void MouseEvent::middleUp() {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_MIDDLEUP;
    SendInput(1, &input, sizeof(INPUT));
}

void MouseEvent::moveTo(int x, int y) {
    double fScreenWidth = GetSystemMetrics(SM_CXSCREEN) - 1;
    double fScreenHeight = GetSystemMetrics(SM_CYSCREEN) - 1;
    double fx = x * (65535.0f / fScreenWidth);
    double fy = y * (65535.0f / fScreenHeight);

    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE;
    input.mi.dx = static_cast<LONG>(fx);
    input.mi.dy = static_cast<LONG>(fy);
    SendInput(1, &input, sizeof(INPUT));
}

void MouseEvent::moveRelative(int dx, int dy) {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_MOVE;
    input.mi.dx = dx;
    input.mi.dy = dy;
    SendInput(1, &input, sizeof(INPUT));
}

void MouseEvent::getPosition(int& x, int& y) {
    POINT point;
    GetCursorPos(&point);
    x = point.x;
    y = point.y;
}

void MouseEvent::scroll(int lines) {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_WHEEL;
    input.mi.mouseData = lines * WHEEL_DELTA;
    SendInput(1, &input, sizeof(INPUT));
}

void MouseEvent::horizontalScroll(int units) {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_HWHEEL;
    input.mi.mouseData = units * WHEEL_DELTA;
    SendInput(1, &input, sizeof(INPUT));
}

void MouseEvent::holdLeft(DWORD durationMs) {
    leftDown();
    std::this_thread::sleep_for(std::chrono::milliseconds(durationMs));
    leftUp();
}

void MouseEvent::holdRight(DWORD durationMs) {
    rightDown();
    std::this_thread::sleep_for(std::chrono::milliseconds(durationMs));
    rightUp();
}

void MouseEvent::drag(int startX, int startY, int endX, int endY) {
    moveTo(startX, startY);
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    leftDown();
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    moveTo(endX, endY);
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    leftUp();
}

// ==================== C风格导出函数 ====================

KEYMOUSE_API void PressKey(char key) {
    KeyEvent::pressKey(key);
}

KEYMOUSE_API void PressEnter() {
    KeyEvent::pressEnter();
}

KEYMOUSE_API void LeftClick() {
    MouseEvent::leftClick();
}

KEYMOUSE_API void MouseMove(int x, int y) {
    MouseEvent::moveTo(x, y);
}