#include <iostream>
#include <vector>
#include "program_utils.h"

int main(int argc, char* argv[])
{
	system("CHCP 65001");
	setlocale(LC_ALL, "en_US.UTF-8");
	std::vector<std::string> console_params;

	printerA(getProgramPath());

	for (int i = 1; i < argc; ++i) {
		console_params.push_back(argv[i]);
	}

	// 检测1
	for (const auto& str : console_params) {
		std::cout << str << "- ";
	}

	shiftHelp(&console_params);
	shiftKeys(&console_params);

	// 检测2
	for (const auto& str : console_params) {
		std::cout << str << "- ";
	}

	return 0;
}