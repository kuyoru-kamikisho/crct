#include <iostream>
#include <string>
#include "utils.h"

int main(int argc, char* argv[])
{
	setlocale(LC_ALL, "en_US.UTF-8");

	std::string input = "1000";
	int sleep_time = 1000;

	if (argc > 1) {
		input = argv[1];
	}

	try {
		sleep_time = std::stoi(input);
	}
	catch (std::invalid_argument const& e) {
		std::cerr << "Invalid number: " << e.what() << std::endl;
	}
	catch (std::out_of_range const& e) {
		std::cerr << "Number out of range: " << e.what() << std::endl;
	}

	std::cout << "CPU Usage:    [ " << GetCpuUsage(sleep_time) << "% ]" << std::endl;
	std::cout << "Disk Usage:   [ " << GetDiskUsage() << "% ]" << std::endl;
	std::cout << "Memory Usage: [ " << GetMemoryUsage() << "% ]" << std::endl;
}
