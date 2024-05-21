#include <windows.h>
#include <iostream>
#include "programInfo.h"

/// <summary>
/// 获取当前程序的所在路径
/// </summary>
/// <returns></returns>
std::string getProgramPath()
{
    TCHAR szFileName[MAX_PATH];
    DWORD dwSize = GetModuleFileName(NULL, szFileName, MAX_PATH);
    if (dwSize > 0) {
        std::wcout << L"程序路径: " << szFileName << std::endl;
        return "";
    }
    return "未获取到程序路径";
}

void printerA(std::string str)
{
    std::cout << " ▪ " << str << std::endl;
}
 