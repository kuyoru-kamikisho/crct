#include <chrono>
#include <thread>
#include <windows.h>
#include <iostream>
#include <algorithm>
#include "program_utils.h"
#include <unordered_map>

std::string getProgramPath()
{
	TCHAR szFileName[MAX_PATH];
	DWORD dwSize = GetModuleFileName(NULL, szFileName, MAX_PATH);
	if (dwSize > 0) {
#ifdef UNICODE
		char szFilePath[MAX_PATH];
		wcstombs_s(nullptr, szFilePath, szFileName, MAX_PATH);
		return std::string(szFilePath);
#else
		return std::string(szFileName);
#endif
	}
	return "未获取到程序路径";
}

void printerA(std::string str)
{
	std::cout << " ▪ " << str << std::endl;
}

void shiftHelp(std::vector<std::string>* p)
{
	if (p == nullptr)return;
	std::string helpInfo =
		"\n"
		"\t[-c [int数值]] 与[-k]搭配使用，按下对应的键位不松开，持续一段时间，模拟长按操作\n"
		"\t[-d [int数值]] 让程序等待一定时间，快捷键触发的功能需要花时间时很有用\n"
		"\t[-h] 帮助信息\n"
		"\t[-k [...键位字符串]] 瞬间按下该关键字后面所声明的所有键位，模拟瞬间点击操作\n"
		"\t[-w [单词字符串]] 模拟输入单词，注意空格仅作为分隔符\n"
		"\n";

	auto it = std::remove_if(p->begin(), p->end(), [](const std::string& s) {
		return s == "-h";
		});
	bool showHelp = (it != p->end());
	p->erase(it, p->end());
	if (showHelp)
	{
		printerA(helpInfo);
	}
}

void shiftKeys(std::vector<std::string>* p)
{
	if (p == nullptr)return;
	bool readContinue = false;
	bool readDelay = false;
	bool readKeys = false;
	bool readWords = false;
	std::vector<std::string> keyTemp;
	std::vector<std::string> wordTemp;
	int cTime;
	int delay;
	for (auto it = p->begin(); it != p->end(); ++it) {
		std::string s = *it;
		if (s == "-c")
		{
			readContinue = true;
			readDelay = false;
			readKeys = false;
			readWords = false;
			if (wordTemp.size() > 0)
			{
				triggerKeys(&wordTemp, 0);
			}
			continue;
		}
		if (s == "-d")
		{
			readContinue = false;
			readDelay = true;
			readKeys = false;
			readWords = false;
			if (keyTemp.size() > 0)
			{
				triggerKeys(&keyTemp, &cTime);
			}
			if (wordTemp.size() > 0)
			{
				triggerKeys(&wordTemp, 0);
			}
			continue;
		}
		if (s == "-k")
		{
			readContinue = false;
			readDelay = false;
			readKeys = true;
			readWords = false;
			if (wordTemp.size() > 0)
			{
				triggerKeys(&wordTemp, 0);
			}
			continue;
		}
		if (s == "-w")
		{
			readContinue = false;
			readDelay = false;
			readKeys = false;
			readWords = true;
			if (keyTemp.size() > 0)
			{
				triggerKeys(&keyTemp, &cTime);
			}
			continue;
		}
		if (readContinue)
		{
			cTime = std::stoi(s);
			readContinue = false;
			readDelay = false;
			readKeys = false;
			readWords = false;
			if (keyTemp.size() > 0)
			{
				triggerKeys(&keyTemp, &cTime);
			}
		}
		if (readDelay)
		{
			delay = std::stoi(s);
			readContinue = false;
			readDelay = false;
			readKeys = false;
			readWords = false;
			shiftDelay(delay);
		}
		if (readKeys)
		{
			keyTemp.push_back(s);
		}
		if (readWords)
		{
			for (char c : s) {
				wordTemp.push_back(std::string(1, c));
			}
			readContinue = false;
			readDelay = false;
			readKeys = false;
			readWords = false;
		}
		bool lt = it + 1 == p->end();
		if (lt)
		{
			if (keyTemp.size() > 0) {
				triggerKeys(&keyTemp, &cTime);
			}
			if (wordTemp.size() > 0) {
				triggerKeys(&wordTemp, &cTime);
			}
		}
	}
}

void shiftDelay(int d)
{
	printerA("等待 " + std::to_string(d) + " ms");
	std::this_thread::sleep_for(std::chrono::milliseconds(d));
}

void shiftWords(std::vector<std::string>* p)
{
}

void triggerKeys(std::vector<std::string>* p, int* c)
{
	printerA("快捷键执行CTRL+D...");
	INPUT inputs[4] = {};
	ZeroMemory(inputs, sizeof(inputs));

	inputs[0].type = INPUT_KEYBOARD;
	inputs[0].ki.wVk = VK_LWIN;

	inputs[1].type = INPUT_KEYBOARD;
	inputs[1].ki.wVk = 'D';

	inputs[2].type = INPUT_KEYBOARD;
	inputs[2].ki.wVk = 'D';
	inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;

	inputs[3].type = INPUT_KEYBOARD;
	inputs[3].ki.wVk = VK_LWIN;
	inputs[3].ki.dwFlags = KEYEVENTF_KEYUP;

	UINT uSent = SendInput(ARRAYSIZE(inputs), inputs, sizeof(INPUT));
	if (uSent != ARRAYSIZE(inputs))
	{
		auto err = std::to_string(static_cast<int>(HRESULT_FROM_WIN32(GetLastError())));
		printerA(err);
	}
}

WORD mapTowVk(const std::string& key) {
	static const std::unordered_map<std::string, WORD> keyMap = {
		
		{"alt", VK_MENU},
		{"backspace", VK_BACK},
		{"ctrl", VK_CONTROL},
		{"delete", VK_DELETE},
		{"esc", VK_ESCAPE},
		{"end", VK_END},
		{"enter", VK_RETURN},
		{"home", VK_HOME},
		{"insert", VK_INSERT},
		{"pause", VK_PAUSE},
		{"pageup", VK_PRIOR},
		{"pagedown", VK_NEXT},
		{"shift", VK_SHIFT},
		{"space", VK_SPACE},
		{"sleep", VK_SLEEP},
		{"tab", VK_TAB},
		{"win", VK_LWIN},

		{"capslock", VK_CAPITAL},
		{"numlock", VK_NUMLOCK},
		{"scrolllock", VK_SCROLL},

		{"left", VK_LEFT},
		{"up", VK_UP},
		{"right", VK_RIGHT},
		{"down", VK_DOWN},
		
		{"LBTN", VK_LBUTTON},
		{"RBTN", VK_RBUTTON},
		{"MBTN", VK_MBUTTON},
		
		{"f1", VK_F1},
		{"f2", VK_F2},
		{"f3", VK_F3},
		{"f4", VK_F4},
		{"f5", VK_F5},
		{"f6", VK_F6},
		{"f7", VK_F7},
		{"f8", VK_F8},
		{"f9", VK_F9},
		{"f10", VK_F10},
		{"f11", VK_F11},
		{"f12", VK_F12},

		{"num0", VK_NUMPAD0},
		{"num1", VK_NUMPAD1},
		{"num2", VK_NUMPAD2},
		{"num3", VK_NUMPAD3},
		{"num4", VK_NUMPAD4},
		{"num5", VK_NUMPAD5},
		{"num6", VK_NUMPAD6},
		{"num7", VK_NUMPAD7},
		{"num8", VK_NUMPAD8},
		{"num9", VK_NUMPAD9},
		{"num+", VK_ADD},
		{"num-", VK_SUBTRACT},
		{"numx", VK_MULTIPLY},
		{"num/", VK_DIVIDE},
		{"num.", VK_DECIMAL},
	};

	auto it = keyMap.find(key);
	if (it != keyMap.end()) {
		return it->second;
	}

	return 0;
}

std::string toUpperCase(const std::string& input)
{
	std::string result = input;
	std::transform(result.begin(), result.end(), result.begin(), ::toupper);
	return result;
}
