#ifndef INPUT_HOOK_H
#define INPUT_HOOK_H

#ifdef INPUTHOOK_EXPORTS
#define INPUTHOOK_API __declspec(dllexport)
#else
#define INPUTHOOK_API __declspec(dllimport)
#endif

#include <string>

// Callback function type definition
typedef void (*EventCallback)(const char* eventStr);

extern "C" {
	// Start monitoring
	INPUTHOOK_API bool StartListening(EventCallback callback);

	// Stop monitoring
	INPUTHOOK_API void StopListening();

	// Check if it is listening
	INPUTHOOK_API bool IsListening();
}

#endif // INPUT_HOOK_H