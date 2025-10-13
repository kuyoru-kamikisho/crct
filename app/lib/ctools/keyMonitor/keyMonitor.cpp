#include <iostream>
#include <windows.h>
#include "KeyMouseMonitor.h"

// 全局标志位
static bool g_running = true;

// 控制台事件处理函数
BOOL WINAPI ConsoleHandler(DWORD signal) {
    if (signal == CTRL_C_EVENT) {
        std::cout << "Received Ctrl+C, stopping..." << std::endl;
        g_running = false;
        return TRUE;
    }
    return FALSE;
}

int main() {
    // 设置控制台事件处理
    if (!SetConsoleCtrlHandler(ConsoleHandler, TRUE)) {
        std::cout << "Warning: Could not set control handler" << std::endl;
    }

    // 启动监听
    if (runKeyMouseMonitor()) {
        std::cout << "KeyMouse monitor started successfully!" << std::endl;
        std::cout << "Press any key or mouse button. Press 'Q' to quit." << std::endl;
        std::cout << "Or press Ctrl+C to stop." << std::endl;

        std::string lastDisplayedEvent; // 避免重复显示相同事件

        // 高效的主循环
        while (g_running) {
            const char* event = getLastEvent();
            if (event && strlen(event) > 0) {
                std::string currentEvent(event);

                // 只显示新事件，避免重复
                if (currentEvent != lastDisplayedEvent) {
                    std::cout << "Event: " << currentEvent << std::endl;
                    lastDisplayedEvent = currentEvent;

                    // 按Q退出
                    if (currentEvent == "Q") {
                        break;
                    }
                }
            }

            // 使用更短的Sleep，但只在需要时检查
            MSG msg;
            while (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
                TranslateMessage(&msg);
                DispatchMessage(&msg);
            }
            Sleep(10); // 10ms 延迟，足够响应但不会太卡
        }

        // 停止监听
        stopKeyMouseMonitor();
        std::cout << "Monitoring stopped." << std::endl;
    }
    else {
        std::cout << "Failed to start monitor" << std::endl;
    }
    return 0;
}