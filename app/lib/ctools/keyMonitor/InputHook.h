#ifndef INPUT_HOOK_H
#define INPUT_HOOK_H

#ifdef INPUTHOOK_EXPORTS
#define INPUTHOOK_API __declspec(dllexport)
#else
#define INPUTHOOK_API __declspec(dllimport)
#endif

#include <string>

// 回调函数类型定义
typedef void (*EventCallback)(const char* eventStr);

extern "C" {
	// 启动监听
	INPUTHOOK_API bool StartListening(EventCallback callback);

	// 停止监听
	INPUTHOOK_API void StopListening();

	// 检查是否正在监听
	INPUTHOOK_API bool IsListening();
}

#endif // INPUT_HOOK_H