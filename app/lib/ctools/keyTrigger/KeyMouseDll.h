#pragma once

#ifdef KEYMOUSEDLL_EXPORTS
#define KEYMOUSE_API __declspec(dllexport)
#else
#define KEYMOUSE_API __declspec(dllimport)
#endif

#include <windows.h>
#include <string>
#include <map>

extern "C" {
    class KEYMOUSE_API KeyEvent {
    public:
        // 基本按键操作
        static void pressKey(char key);
        static void pressKey(int virtualKey);
        static void keyDown(char key);
        static void keyDown(int virtualKey);
        static void keyUp(char key);
        static void keyUp(int virtualKey);

        // 特殊按键
        static void pressEnter();
        static void pressTab();
        static void pressSpace();
        static void pressBackspace();
        static void pressEscape();

        // 组合键
        static void pressCtrlC();
        static void pressCtrlV();
        static void pressCtrlA();
        static void pressCtrlO();
        static void pressAltF4();

        // 通用组合键
        static void pressCombination(const std::string& keys);

        // 持续按键
        static void holdKey(char key, DWORD durationMs = 1000);
        static void holdKey(int virtualKey, DWORD durationMs = 1000);

        // 输入文本
        static void typeText(const std::string& text);

        // 键盘状态
        static bool isKeyPressed(int virtualKey);
    };

    class KEYMOUSE_API MouseEvent {
    public:
        // 基本点击操作
        static void leftClick();
        static void rightClick();
        static void middleClick();
        static void doubleClick();

        // 按下和释放
        static void leftDown();
        static void leftUp();
        static void rightDown();
        static void rightUp();
        static void middleDown();
        static void middleUp();

        // 移动鼠标
        static void moveTo(int x, int y);
        static void moveRelative(int dx, int dy);

        // 获取鼠标位置
        static void getPosition(int& x, int& y);

        // 滚轮
        static void scroll(int lines);
        static void horizontalScroll(int units);

        // 持续按下
        static void holdLeft(DWORD durationMs = 1000);
        static void holdRight(DWORD durationMs = 1000);

        // 拖拽
        static void drag(int startX, int startY, int endX, int endY);
    };

    // C风格导出函数（便于其他语言调用）
    KEYMOUSE_API void PressKey(char key);
    KEYMOUSE_API void PressEnter();
    KEYMOUSE_API void LeftClick();
    KEYMOUSE_API void MouseMove(int x, int y);
}
