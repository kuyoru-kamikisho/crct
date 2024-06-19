#pragma once
#pragma comment(lib, "pdh.lib")
#ifdef DMC_EXPORTS
#define DMC_API __declspec(dllexport ) 
#else
#define DMC_API __declspec(dllimport)
#endif

#define BUFFER_SIZE 4096

/// <summary>
/// 获取CPU使用率
/// </summary>
/// <param name="milliseconds">CPU时钟记录时间</param>
extern"C" DMC_API float GetCpuUsage(int milliseconds);
/// <summary>
/// 获取磁盘利用率
/// </summary>
extern"C" DMC_API float GetDiskUsage();
/// <summary>
/// 获取内存使用率
/// </summary>
extern"C" DMC_API float GetMemoryUsage();


