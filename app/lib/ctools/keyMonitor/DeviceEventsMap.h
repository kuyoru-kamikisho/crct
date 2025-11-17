#pragma once
#include <map>
#include <string>
#include <windows.h>


// Virtual key code mapping
std::map<int, std::string> keyMap = {
	// Alphabet keys
	{0x41, "a"}, {0x42, "b"}, {0x43, "c"}, {0x44, "d"}, {0x45, "e"},
	{0x46, "f"}, {0x47, "g"}, {0x48, "h"}, {0x49, "i"}, {0x4A, "j"},
	{0x4B, "k"}, {0x4C, "l"}, {0x4D, "m"}, {0x4E, "n"}, {0x4F, "o"},
	{0x50, "p"}, {0x51, "q"}, {0x52, "r"}, {0x53, "s"}, {0x54, "t"},
	{0x55, "u"}, {0x56, "v"}, {0x57, "w"}, {0x58, "x"}, {0x59, "y"},
	{0x5A, "z"},

	// Number keys
	{0x30, "0"}, {0x31, "1"}, {0x32, "2"}, {0x33, "3"}, {0x34, "4"},
	{0x35, "5"}, {0x36, "6"}, {0x37, "7"}, {0x38, "8"}, {0x39, "9"},

	// function key F1-F12
	{VK_F1, "f1"}, {VK_F2, "f2"}, {VK_F3, "f3"}, {VK_F4, "f4"},
	{VK_F5, "f5"}, {VK_F6, "f6"}, {VK_F7, "f7"}, {VK_F8, "f8"},
	{VK_F9, "f9"}, {VK_F10, "f10"}, {VK_F11, "f11"}, {VK_F12, "f12"},

	// Navigation keys
	{VK_RETURN, "enter"}, {VK_TAB, "tab"}, {VK_CAPITAL, "capslock"},
	{VK_SHIFT, "shift"}, {VK_CONTROL, "ctrl"}, {VK_MENU, "alt"},
	{VK_SPACE, "space"}, {VK_BACK, "backspace"}, {VK_DELETE, "delete"},
	{VK_INSERT, "insert"}, {VK_HOME, "home"}, {VK_END, "end"},
	{VK_PRIOR, "pageup"}, {VK_NEXT, "pagedown"},
	{0xA0,"leftShift"},{0xA1,"rightShift"},
	{0xA2,"leftCtrl"},{0xA3,"rightCtrl"},
	{0xA4,"leftAlt"},{0xA5,"rightAlt"},

	// arrow keys
	{ VK_UP, "up" }, {VK_DOWN, "down"}, {VK_LEFT, "left"}, {VK_RIGHT, "right"},

	// Symbol key
	{VK_OEM_COMMA, ","}, {VK_OEM_PERIOD, "."}, {VK_OEM_2, "/"},
	{VK_OEM_1, ";"}, {VK_OEM_7, "\""}, {VK_OEM_4, "["}, {VK_OEM_6, "]"},
	{VK_OEM_5, "\\"}, {VK_OEM_MINUS, "-"}, {VK_OEM_PLUS, "="},
	{VK_OEM_3, "`"},

	// Numeric keypad
	{VK_NUMPAD0, "num0"}, {VK_NUMPAD1, "num1"}, {VK_NUMPAD2, "num2"},
	{VK_NUMPAD3, "num3"}, {VK_NUMPAD4, "num4"}, {VK_NUMPAD5, "num5"},
	{VK_NUMPAD6, "num6"}, {VK_NUMPAD7, "num7"}, {VK_NUMPAD8, "num8"},
	{VK_NUMPAD9, "num9"},
	{VK_NUMLOCK, "numlock"}, {VK_MULTIPLY, "num*"}, {VK_ADD, "num+"},
	{VK_SUBTRACT, "num-"}, {VK_DECIMAL, "num."}, {VK_DIVIDE, "num/"},

	// Other special keys
	{VK_ESCAPE, "esc"}, {VK_SNAPSHOT, "printscreen"}, {VK_SCROLL, "scrolllock"},
	{VK_PAUSE, "pause"}, {VK_LWIN, "win"}, {VK_APPS, "apps"}
};

// Mouse button mapping
std::map<int, std::string> mouseButtonMap = {
	{WM_LBUTTONDOWN, "leftclick"},
	{WM_LBUTTONUP, "leftclick"},
	{WM_RBUTTONDOWN, "rightclick"},
	{WM_RBUTTONUP, "rightclick"},
	{WM_MBUTTONDOWN, "middleclick"},
	{WM_MBUTTONUP, "middleclick"},
	{WM_XBUTTONDOWN, "xbutton"},
	{WM_XBUTTONUP, "xbutton"}
};

// Mouse wheel direction mapping
std::map<short, std::string> wheelDirectionMap = {
	{1, "up"},
	{-1, "down"}
};
