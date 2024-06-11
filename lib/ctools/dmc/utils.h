#pragma once
#pragma comment(lib, "pdh.lib")

#define BUFFER_SIZE 4096

/// <summary>
/// 获取CPU使用率
/// </summary>
/// <param name="milliseconds">CPU时钟记录时间</param>
float GetCpuUsage(int milliseconds);
/// <summary>
/// 获取磁盘利用率
/// </summary>
float GetDiskUsage();
/// <summary>
/// 获取内存使用率
/// </summary>
float GetMemoryUsage();


