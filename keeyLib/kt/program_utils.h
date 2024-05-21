#pragma once
#include <string>
#include <vector>

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
/// 键位操作
/// </summary>
void shiftKeys(std::vector<std::string>* p);

/// <summary>
/// 延迟操作
/// </summary>
void shiftDelay(std::vector<std::string>* p);

/// <summary>
/// 持续操作
/// </summary>
void shiftContinue(std::vector<std::string>* p);

/// <summary>
/// 单词操作
/// </summary>
void shiftWords(std::vector<std::string>* p);

#endif