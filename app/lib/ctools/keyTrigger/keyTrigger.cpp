// keyTrigger.cpp : 此文件包含 "main" 函数。程序执行将在此处开始并结束。
//

#include <iostream>
#include "KeyMouseDll.h"

int main()
{
    setlocale(LC_ALL, "en_US.UTF-8");

    std::cout << "Test start!\n";

    KeyEvent::pressEnter();
    KeyEvent::keyDown(VK_LWIN); 
    KeyEvent::pressKey('R');    
    KeyEvent::keyUp(VK_LWIN);
    KeyEvent::pressKey('R');   
    KeyEvent::pressKey('R');   

    KeyEvent::keyDown(VK_SHIFT);
    KeyEvent::pressKey('R');    
    KeyEvent::keyUp(VK_SHIFT); 

    KeyEvent::keyDown(VK_SHIFT);  
    KeyEvent::pressKey('0');      
    KeyEvent::pressKey(VK_OEM_PLUS);   
    KeyEvent::pressKey(VK_OEM_3);     
    KeyEvent::keyUp(VK_SHIFT);    
    KeyEvent::pressKey(VK_OEM_3);     
    KeyEvent::pressKey('1');      
    KeyEvent::pressKey('0');      
    KeyEvent::pressKey('8');      
    KeyEvent::pressKey('1');      
    KeyEvent::pressKey('3');      
    KeyEvent::pressKey('3');      

    KeyEvent::pressKey('R');    
    KeyEvent::pressBackspace();    
    KeyEvent::pressBackspace();    

    std::cout << "Test end!\n";
}

// 运行程序: Ctrl + F5 或调试 >“开始执行(不调试)”菜单
// 调试程序: F5 或调试 >“开始调试”菜单

// 入门使用技巧: 
//   1. 使用解决方案资源管理器窗口添加/管理文件
//   2. 使用团队资源管理器窗口连接到源代码管理
//   3. 使用输出窗口查看生成输出和其他消息
//   4. 使用错误列表窗口查看错误
//   5. 转到“项目”>“添加新项”以创建新的代码文件，或转到“项目”>“添加现有项”以将现有代码文件添加到项目
//   6. 将来，若要再次打开此项目，请转到“文件”>“打开”>“项目”并选择 .sln 文件
