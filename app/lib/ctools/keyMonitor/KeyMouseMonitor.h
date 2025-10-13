#pragma once

#ifdef KEYMOUSEMONITOR_EXPORTS
#define KEYMOUSEMONITOR_API __declspec(dllexport)
#else
#define KEYMOUSEMONITOR_API __declspec(dllimport)
#endif

#include <string>

extern "C" {
    // 开始全局监听键盘鼠标事件
    KEYMOUSEMONITOR_API bool runKeyMouseMonitor();

    // 停止并销毁监听
    KEYMOUSEMONITOR_API void stopKeyMouseMonitor();

    // 获取最后的事件信息（可选）
    KEYMOUSEMONITOR_API const char* getLastEvent();
}