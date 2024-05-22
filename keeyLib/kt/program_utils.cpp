#include <windows.h>
#include <iostream>
#include "program_utils.h"

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
		"\t[-c] 与[-k]搭配使用，按下对应的键位不松开，持续一段时间，模拟长按操作\n"
		"\t[-d] 让程序等待一定时间，快捷键触发的功能需要花时间时很有用\n"
		"\t[-h] 帮助信息\n"
		"\t[-k] 瞬间按下该关键字后面所声明的所有键位，模拟瞬间点击操作\n"
		"\t[-w] 模拟输入单词，注意空格仅作为分隔符\n"
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
	bool readContinue = false;
	bool readDelay = false;
	bool readKeys = false;
	bool readWords = false;
	std::vector<std::string> keyTemp;
	for (auto it = p->begin(); it != p->end(); ++it) {
		std::string s = *it;
		if (s == "-c")
		{
			readContinue = true;
			readDelay = false;
			readKeys = false;
			readWords = false;
			continue;
		}
		if (s == "-d")
		{
			readContinue = false;
			readDelay = true;
			readKeys = false;
			readWords = false;
			continue;
		}
		if (s == "-k")
		{
			readContinue = false;
			readDelay = false;
			readKeys = true;
			readWords = false;
			continue;
		}
		if (s == "-w")
		{
			readContinue = false;
			readDelay = false;
			readKeys = false;
			readWords = true;
			continue;
		}
		if (readContinue)
		{

		}
		if (readDelay)
		{

		}
		if (readKeys)
		{

		}
		if (readWords)
		{

		}
	}
}

void shiftDelay(std::vector<std::string>* p)
{
}

void shiftContinue(std::vector<std::string>* p)
{
}

void shiftWords(std::vector<std::string>* p)
{
}
