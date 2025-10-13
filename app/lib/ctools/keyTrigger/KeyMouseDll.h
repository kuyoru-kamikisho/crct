#pragma once

#ifdef KEYMOUSEDLL_EXPORTS
#define KEYMOUSE_API __declspec(dllexport)
#else
#define KEYMOUSE_API __declspec(dllimport)
#endif

#include <windows.h>
#include <string>
#include <map>

// 基本按键操作
KEYMOUSE_API void pressKey(std::string key);
KEYMOUSE_API void pressKey(int virtualKey);
KEYMOUSE_API void keyDown(std::string key);
KEYMOUSE_API void keyDown(int virtualKey);
KEYMOUSE_API void keyUp(std::string key);
KEYMOUSE_API void keyUp(int virtualKey);

// 特殊按键
KEYMOUSE_API void pressEnter();
KEYMOUSE_API void pressTab();
KEYMOUSE_API void pressSpace();
KEYMOUSE_API void pressBackspace();
KEYMOUSE_API void pressEscape();

// 组合键
KEYMOUSE_API void pressCtrlC();
KEYMOUSE_API void pressCtrlV();
KEYMOUSE_API void pressCtrlA();
KEYMOUSE_API void pressCtrlO();
KEYMOUSE_API void pressAltF4();

// 通用组合键
KEYMOUSE_API void pressCombination(const std::string& keys);

// 持续按键
KEYMOUSE_API void holdKey(std::string key, DWORD durationMs = 1000);
KEYMOUSE_API void holdKey(int virtualKey, DWORD durationMs = 1000);

// 输入文本
KEYMOUSE_API void typeText(const std::string& text);

// 键盘状态
KEYMOUSE_API bool isKeyPressed(int virtualKey);


// 基本点击操作
KEYMOUSE_API void leftClick();
KEYMOUSE_API void rightClick();
KEYMOUSE_API void middleClick();
KEYMOUSE_API void doubleClick();

// 按下和释放
KEYMOUSE_API void leftDown();
KEYMOUSE_API void leftUp();
KEYMOUSE_API void rightDown();
KEYMOUSE_API void rightUp();
KEYMOUSE_API void middleDown();
KEYMOUSE_API void middleUp();

// 移动鼠标
KEYMOUSE_API void moveTo(int x, int y);
KEYMOUSE_API void moveRelative(int dx, int dy);

// 获取鼠标位置
KEYMOUSE_API void getPosition(int& x, int& y);

// 滚轮
KEYMOUSE_API void scroll(int lines);
KEYMOUSE_API void horizontalScroll(int units);

// 持续按下
KEYMOUSE_API void holdLeft(DWORD durationMs = 1000);
KEYMOUSE_API void holdRight(DWORD durationMs = 1000);

// 拖拽
KEYMOUSE_API void drag(int startX, int startY, int endX, int endY);
