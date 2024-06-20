#include "utils.h"
#include <iostream>
#include <windows.h>
#include <pdh.h>
#include <pdhmsg.h>

float GetCpuUsage(int milliseconds) {
	HANDLE hEvent = CreateEvent(NULL, FALSE, FALSE, NULL);
	if (hEvent == NULL) {
		std::cerr << "CreateEvent error" << std::endl;
		return -1.0f;
	}

	PDH_STATUS status;
	PDH_HQUERY query;
	PDH_HCOUNTER counter;
	PDH_FMT_COUNTERVALUE value;

	status = PdhOpenQuery(NULL, 0, &query);
	if (status != ERROR_SUCCESS) {
		std::cerr << "PdhOpenQuery error: " << status << std::endl;
		CloseHandle(hEvent);
		return -1.0f;
	}

	status = PdhAddCounter(query, L"\\Processor(_Total)\\% Processor Time", 0, &counter);
	if (status != ERROR_SUCCESS) {
		std::cerr << "PdhAddCounter error: " << status << std::endl;
		PdhCloseQuery(query);
		CloseHandle(hEvent);
		return -1.0f;
	}

	status = PdhCollectQueryData(query);
	if (status != ERROR_SUCCESS) {
		std::cerr << "PdhCollectQueryData error: " << status << std::endl;
		PdhCloseQuery(query);
		CloseHandle(hEvent);
		return -1.0f;
	}

	WaitForSingleObject(hEvent, milliseconds);

	SetEvent(hEvent);

	status = PdhCollectQueryData(query);
	if (status != ERROR_SUCCESS) {
		std::cerr << "PdhCollectQueryData (2nd time) error: " << status << std::endl;
	}

	status = PdhGetFormattedCounterValue(counter, PDH_FMT_DOUBLE, NULL, &value);
	if (status != ERROR_SUCCESS) {
		std::cerr << "PdhGetFormattedCounterValue error: " << status << std::endl;
		PdhCloseQuery(query);
		CloseHandle(hEvent);
		return -1.0f;
	}

	PdhCloseQuery(query);
	CloseHandle(hEvent);

	return static_cast<float>(value.doubleValue);
}

float GetDiskUsage() {
	ULARGE_INTEGER freeSpaceAvailable, totalSpace, totalFreeSpace;
	if (GetDiskFreeSpaceEx(L"C:\\", &freeSpaceAvailable, &totalSpace, &totalFreeSpace)) {
		float usage = 100.0f - ((static_cast<float>(totalFreeSpace.QuadPart) / totalSpace.QuadPart) * 100);
		return usage;
	}
	return -1.0f;
}

float GetMemoryUsage() {
	MEMORYSTATUSEX memInfo;
	memInfo.dwLength = sizeof(memInfo);
	GlobalMemoryStatusEx(&memInfo);

	float memoryLoad = static_cast<float>(memInfo.dwMemoryLoad);
	return memoryLoad;
}