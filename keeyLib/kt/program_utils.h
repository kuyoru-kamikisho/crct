#pragma once
#include <string>
#include <vector>
#include <Windows.h>

#ifndef PROGRAM_INFO_H
#define PROGRAM_INFO_H

/// <summary>
/// 获取当前程序的所在路径
/// </summary>
/// <returns></returns>
std::string getProgramPath();

/// <summary>
/// 格式化输出
/// </summary>
/// <param name="str"></param>
void printerA(std::string str);

/// <summary>
/// 打印帮助信息
/// </summary>
void shiftHelp(std::vector<std::string> *p);

/// <summary>
/// 参数处理
/// </summary>
void shiftKeys(std::vector<std::string>* p);

/// <summary>
/// 延迟操作
/// </summary>
void shiftDelay(int d);

/// <summary>
/// 单词操作
/// </summary>
void shiftWords(std::vector<std::string>* p);

/// <summary>
/// 触发按键
/// </summary>
/// <param name="p">键位列表</param>
/// <param name="c">按键持续时间</param>
void triggerKeys(std::vector<std::string>* p, int* c);

/// <summary>
/// 将字符串映射为win api虚拟键值
/// </summary>
/// <param name="key">按键字符串</param>
/// <returns>如果能在已定义的列表中找到，则返回对应的虚拟键值，否则返回0</returns>
WORD mapTowVk(const std::string& key);

/// <summary>
/// 将字符串转换为大写
/// </summary>
/// <param name="input">字符串</param>
/// <returns>大写后的字符串</returns>
std::string toUpperCase(const std::string& input);

#endif