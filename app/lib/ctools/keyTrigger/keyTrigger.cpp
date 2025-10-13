#include <iostream>
#include "KeyMouseDll.h"

int main()
{
	setlocale(LC_ALL, "en_US.UTF-8");

	std::cout << "Test start!\n";

	pressEnter();
	keyDown(VK_LWIN);
	pressKey('R');
	keyUp(VK_LWIN);
	pressKey('R');
	pressKey('R');

	keyDown(VK_SHIFT);
	pressKey('R');
	keyUp(VK_SHIFT);

	keyDown(VK_SHIFT);
	pressKey('0');
	pressKey(VK_OEM_PLUS);
	pressKey(VK_OEM_3);
	keyUp(VK_SHIFT);
	pressKey(VK_OEM_3);
	pressKey('1');
	pressKey('0');
	pressKey('8');
	pressKey('1');
	pressKey('3');
	pressKey('3');

	pressKey('R');
	pressBackspace();
	pressBackspace();

	std::cout << "Test end!\n";
}
