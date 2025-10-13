#include "KeyMouseDll.h"
#include <map>
#include <thread>
#include <chrono>
#include <algorithm> 
#include <iostream>

// 虚拟键码映射
std::map<std::string, int> keyMap = {
	// 字母键
	{"a", 0x41}, {"b", 0x42}, {"c", 0x43}, {"d", 0x44}, {"e", 0x45},
	{"f", 0x46}, {"g", 0x47}, {"h", 0x48}, {"i", 0x49}, {"j", 0x4A},
	{"k", 0x4B}, {"l", 0x4C}, {"m", 0x4D}, {"n", 0x4E}, {"o", 0x4F},
	{"p", 0x50}, {"q", 0x51}, {"r", 0x52}, {"s", 0x53}, {"t", 0x54},
	{"u", 0x55}, {"v", 0x56}, {"w", 0x57}, {"x", 0x58}, {"y", 0x59},
	{"z", 0x5A},

	// 数字键
	{"0", 0x30}, {"1", 0x31}, {"2", 0x32}, {"3", 0x33}, {"4", 0x34},
	{"5", 0x35}, {"6", 0x36}, {"7", 0x37}, {"8", 0x38}, {"9", 0x39},

	// 功能键 F1-F12
	{"f1", VK_F1}, {"f2", VK_F2}, {"f3", VK_F3}, {"f4", VK_F4},
	{"f5", VK_F5}, {"f6", VK_F6}, {"f7", VK_F7}, {"f8", VK_F8},
	{"f9", VK_F9}, {"f10", VK_F10}, {"f11", VK_F11}, {"f12", VK_F12},

	// 导航键
	{"enter", VK_RETURN}, {"tab", VK_TAB}, {"capslock", VK_CAPITAL},
	{"shift", VK_SHIFT}, {"ctrl", VK_CONTROL}, {"alt", VK_MENU},
	{"space", VK_SPACE}, {"backspace", VK_BACK}, {"delete", VK_DELETE},
	{"insert", VK_INSERT}, {"home", VK_HOME}, {"end", VK_END},
	{"pageup", VK_PRIOR}, {"pagedown", VK_NEXT},

	// 方向键
	{"up", VK_UP}, {"down", VK_DOWN}, {"left", VK_LEFT}, {"right", VK_RIGHT},

	// 符号键
	{",", VK_OEM_COMMA}, {".", VK_OEM_PERIOD}, {"/", VK_OEM_2},
	{";", VK_OEM_1}, {"\"", VK_OEM_7}, {"[", VK_OEM_4}, {"]", VK_OEM_6},
	{"\\", VK_OEM_5}, {"-", VK_OEM_MINUS}, {"=", VK_OEM_PLUS},
	{"`", VK_OEM_3},

	// 数字小键盘
	{"num0", VK_NUMPAD0}, {"num1", VK_NUMPAD1}, {"num2", VK_NUMPAD2},
	{"num3", VK_NUMPAD3}, {"num4", VK_NUMPAD4}, {"num5", VK_NUMPAD5},
	{"num6", VK_NUMPAD6}, {"num7", VK_NUMPAD7}, {"num8", VK_NUMPAD8},
	{"num9", VK_NUMPAD9},
	{"numlock", VK_NUMLOCK}, {"num*", VK_MULTIPLY}, {"num+", VK_ADD},
	{"num-", VK_SUBTRACT}, {"num.", VK_DECIMAL}, {"num/", VK_DIVIDE},

	// 其他特殊键
	{"esc", VK_ESCAPE}, {"printscreen", VK_SNAPSHOT}, {"scrolllock", VK_SCROLL},
	{"pause", VK_PAUSE}, {"win", VK_LWIN}, {"apps", VK_APPS}
};

// 辅助函数：将字符串转换为小写
std::string toLower(const std::string& str) {
	std::string result = str;
	std::transform(result.begin(), result.end(), result.begin(), ::tolower);
	return result;
}

// 获取键码的函数
int getKeyCode(const std::string& key) {
	std::string lowerKey = toLower(key);

	auto it = keyMap.find(lowerKey);
	if (it != keyMap.end()) {
		return it->second;
	}

	std::locale::global(std::locale(""));
	std::wcout.imbue(std::locale());
	std::cout << "undefined:" << key << "\n";

	return -1; // 未找到
}

// ==================== KeyEvent 实现 ====================

void pressKey(std::string key) {
	int vk = getKeyCode(key);
	if (vk != -1) {
		keyDown(vk);
		std::this_thread::sleep_for(std::chrono::milliseconds(50));
		keyUp(vk);
	}
}

void pressKey(int virtualKey) {
	keyDown(virtualKey);
	std::this_thread::sleep_for(std::chrono::milliseconds(50));
	keyUp(virtualKey);
}

void keyDown(std::string key) {
	int vk = getKeyCode(key);
	if (vk != -1) {
		keyDown(vk);
	}
}

void keyDown(int virtualKey) {
	INPUT input = { 0 };
	input.type = INPUT_KEYBOARD;
	input.ki.wVk = virtualKey;
	input.ki.dwFlags = 0;
	SendInput(1, &input, sizeof(INPUT));
}

void keyUp(std::string key) {
	int vk = getKeyCode(key);
	if (vk != -1) {
		keyUp(vk);
	}
}

void keyUp(int virtualKey) {
	INPUT input = { 0 };
	input.type = INPUT_KEYBOARD;
	input.ki.wVk = virtualKey;
	input.ki.dwFlags = KEYEVENTF_KEYUP;
	SendInput(1, &input, sizeof(INPUT));
}

void pressEnter() {
	pressKey(VK_RETURN);
}

void pressTab() {
	pressKey(VK_TAB);
}

void pressSpace() {
	pressKey(VK_SPACE);
}

void pressBackspace() {
	pressKey(VK_BACK);
}

void pressEscape() {
	pressKey(VK_ESCAPE);
}

void pressCtrlC() {
	keyDown(VK_CONTROL);
	pressKey("C");
	keyUp(VK_CONTROL);
}

void pressCtrlV() {
	keyDown(VK_CONTROL);
	pressKey("V");
	keyUp(VK_CONTROL);
}

void pressCtrlA() {
	keyDown(VK_CONTROL);
	pressKey("A");
	keyUp(VK_CONTROL);
}

void pressCtrlO() {
	keyDown(VK_CONTROL);
	pressKey("O");
	keyUp(VK_CONTROL);
}

void pressAltF4() {
	keyDown(VK_MENU);
	keyDown(VK_F4);
	keyUp(VK_F4);
	keyUp(VK_MENU);
}

void pressCombination(const std::string& keys) {
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

void holdKey(std::string key, DWORD durationMs) {
	int vk = getKeyCode(key);
	if (vk != -1) {
		holdKey(vk, durationMs);
	}
}

void holdKey(int virtualKey, DWORD durationMs) {
	keyDown(virtualKey);
	std::this_thread::sleep_for(std::chrono::milliseconds(durationMs));
	keyUp(virtualKey);
}

void typeText(const std::string& text) {
	for (char c : text) {
		pressKey(std::string(1, c));
		std::this_thread::sleep_for(std::chrono::milliseconds(30));
	}
}

bool isKeyPressed(int virtualKey) {
	return (GetAsyncKeyState(virtualKey) & 0x8000) != 0;
}

// ==================== MouseEvent 实现 ====================

void leftClick() {
	leftDown();
	std::this_thread::sleep_for(std::chrono::milliseconds(50));
	leftUp();
}

void rightClick() {
	rightDown();
	std::this_thread::sleep_for(std::chrono::milliseconds(50));
	rightUp();
}

void middleClick() {
	middleDown();
	std::this_thread::sleep_for(std::chrono::milliseconds(50));
	middleUp();
}

void doubleClick() {
	leftClick();
	std::this_thread::sleep_for(std::chrono::milliseconds(150));
	leftClick();
}

void leftDown() {
	INPUT input = { 0 };
	input.type = INPUT_MOUSE;
	input.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
	SendInput(1, &input, sizeof(INPUT));
}

void leftUp() {
	INPUT input = { 0 };
	input.type = INPUT_MOUSE;
	input.mi.dwFlags = MOUSEEVENTF_LEFTUP;
	SendInput(1, &input, sizeof(INPUT));
}

void rightDown() {
	INPUT input = { 0 };
	input.type = INPUT_MOUSE;
	input.mi.dwFlags = MOUSEEVENTF_RIGHTDOWN;
	SendInput(1, &input, sizeof(INPUT));
}

void rightUp() {
	INPUT input = { 0 };
	input.type = INPUT_MOUSE;
	input.mi.dwFlags = MOUSEEVENTF_RIGHTUP;
	SendInput(1, &input, sizeof(INPUT));
}

void middleDown() {
	INPUT input = { 0 };
	input.type = INPUT_MOUSE;
	input.mi.dwFlags = MOUSEEVENTF_MIDDLEDOWN;
	SendInput(1, &input, sizeof(INPUT));
}

void middleUp() {
	INPUT input = { 0 };
	input.type = INPUT_MOUSE;
	input.mi.dwFlags = MOUSEEVENTF_MIDDLEUP;
	SendInput(1, &input, sizeof(INPUT));
}

void moveTo(int x, int y) {
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

void moveRelative(int dx, int dy) {
	INPUT input = { 0 };
	input.type = INPUT_MOUSE;
	input.mi.dwFlags = MOUSEEVENTF_MOVE;
	input.mi.dx = dx;
	input.mi.dy = dy;
	SendInput(1, &input, sizeof(INPUT));
}

void getPosition(int& x, int& y) {
	POINT point;
	GetCursorPos(&point);
	x = point.x;
	y = point.y;
}

void scroll(int lines) {
	INPUT input = { 0 };
	input.type = INPUT_MOUSE;
	input.mi.dwFlags = MOUSEEVENTF_WHEEL;
	input.mi.mouseData = lines * WHEEL_DELTA;
	SendInput(1, &input, sizeof(INPUT));
}

void horizontalScroll(int units) {
	INPUT input = { 0 };
	input.type = INPUT_MOUSE;
	input.mi.dwFlags = MOUSEEVENTF_HWHEEL;
	input.mi.mouseData = units * WHEEL_DELTA;
	SendInput(1, &input, sizeof(INPUT));
}

void holdLeft(DWORD durationMs) {
	leftDown();
	std::this_thread::sleep_for(std::chrono::milliseconds(durationMs));
	leftUp();
}

void holdRight(DWORD durationMs) {
	rightDown();
	std::this_thread::sleep_for(std::chrono::milliseconds(durationMs));
	rightUp();
}

void drag(int startX, int startY, int endX, int endY) {
	moveTo(startX, startY);
	std::this_thread::sleep_for(std::chrono::milliseconds(100));
	leftDown();
	std::this_thread::sleep_for(std::chrono::milliseconds(200));
	moveTo(endX, endY);
	std::this_thread::sleep_for(std::chrono::milliseconds(200));
	leftUp();
}

// ==================== C风格导出函数 ====================

void PressKey(std::string key) {
	pressKey(key);
}

void PressEnter() {
	pressEnter();
}

void LeftClick() {
	leftClick();
}

void MouseMove(int x, int y) {
	moveTo(x, y);
}