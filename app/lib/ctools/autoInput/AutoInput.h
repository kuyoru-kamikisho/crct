// AutoInput.h
#pragma once
#include <windows.h>

#ifdef BUILDING_AUTOINPUT
#define AI_API extern "C" __declspec(dllexport)
#else
#define AI_API extern "C" __declspec(dllimport)
#endif

// Key functions
AI_API BOOL KeyDown(const char* keyName, int durationMs /*=0*/);
AI_API BOOL KeyUp(const char* keyName);

// Mouse functions
AI_API BOOL MouseMoveAt(int x, int y);
AI_API BOOL LeftClick(int x, int y);
AI_API BOOL RightClick(int x, int y);
AI_API BOOL MiddleClick(int x, int y);

AI_API BOOL LeftDown(int x, int y);
AI_API BOOL LeftUp(int x, int y);
AI_API BOOL RightDown(int x, int y);
AI_API BOOL RightUp(int x, int y);
AI_API BOOL MiddleDown(int x, int y);
AI_API BOOL MiddleUp(int x, int y);

// Scroll: dir = "up" or "down"
AI_API BOOL Scroll(const char* dir, int x, int y, int distance);
