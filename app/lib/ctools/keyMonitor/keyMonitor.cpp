#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <atomic>
#include "InputHook.h"

// 全局变量，用于统计事件数量
std::atomic<int> eventCount{ 0 };

// 事件回调函数
void OnInputEvent(const char* eventStr) {
    eventCount++;
    std::cout << "[" << eventCount << "] " << eventStr << std::endl;
}

// 显示帮助信息
void ShowHelp() {
    std::cout << "==========================================" << std::endl;
    std::cout << "InputHook 测试程序" << std::endl;
    std::cout << "==========================================" << std::endl;
    std::cout << "命令列表:" << std::endl;
    std::cout << "  start  - 开始监听输入事件" << std::endl;
    std::cout << "  stop   - 停止监听输入事件" << std::endl;
    std::cout << "  status - 显示监听状态" << std::endl;
    std::cout << "  count  - 显示事件计数" << std::endl;
    std::cout << "  clear  - 清空事件计数" << std::endl;
    std::cout << "  help   - 显示此帮助信息" << std::endl;
    std::cout << "  exit   - 退出程序" << std::endl;
    std::cout << "==========================================" << std::endl;
    std::cout << "开始测试前，请确保:" << std::endl;
    std::cout << "1. 在Visual Studio中以Debug模式运行" << std::endl;
    std::cout << "2. 程序运行后切换到其他窗口进行输入测试" << std::endl;
    std::cout << "3. 低权限程序可能无法捕获某些系统按键" << std::endl;
    std::cout << "==========================================" << std::endl;
}

// 显示监听状态
void ShowStatus() {
    bool isListening = IsListening();
    std::cout << "监听状态: " << (isListening ? "运行中" : "已停止") << std::endl;
    std::cout << "事件计数: " << eventCount << std::endl;
}

// 清空事件计数
void ClearCount() {
    eventCount = 0;
    std::cout << "事件计数已清空" << std::endl;
}

// 开始监听
void StartListening() {
    if (IsListening()) {
        std::cout << "监听已经在运行中!" << std::endl;
        return;
    }

    if (StartListening(OnInputEvent)) {
        std::cout << "开始监听输入事件..." << std::endl;
        std::cout << "请切换到其他窗口进行键盘鼠标操作测试" << std::endl;
        std::cout << "返回本窗口输入 'stop' 停止监听" << std::endl;
    }
    else {
        std::cout << "启动监听失败!" << std::endl;
    }
}

// 停止监听
void disposeListening() {
    if (!IsListening()) {
        std::cout << "监听未在运行!" << std::endl;
        return;
    }

    StopListening();
    std::cout << "已停止监听输入事件" << std::endl;
    std::cout << "总共捕获 " << eventCount << " 个事件" << std::endl;
}

// 自动测试函数
void AutoTest() {
    std::cout << "开始自动测试..." << std::endl;
    std::cout << "5秒后开始监听，请准备进行键盘鼠标操作测试" << std::endl;

    std::this_thread::sleep_for(std::chrono::seconds(5));

    if (StartListening(OnInputEvent)) {
        std::cout << "监听已启动，请在10秒内进行键盘鼠标操作..." << std::endl;
        std::cout << "尝试按下: A, B, C, 空格, 回车, 退格等键" << std::endl;
        std::cout << "尝试移动鼠标和点击鼠标按钮" << std::endl;

        // 监听10秒
        std::this_thread::sleep_for(std::chrono::seconds(10));

        disposeListening();
        std::cout << "自动测试结束" << std::endl;
        std::cout << "总共捕获 " << eventCount << " 个事件" << std::endl;
    }
    else {
        std::cout << "自动测试启动失败!" << std::endl;
    }
}

// 主函数
int main() {
    std::cout << "InputHook 本地测试程序" << std::endl;
    std::cout << "编译时间: " << __DATE__ << " " << __TIME__ << std::endl;

    ShowHelp();

    std::string command;
    bool running = true;

    while (running) {
        std::cout << std::endl << "请输入命令: ";
        std::getline(std::cin, command);

        if (command == "start") {
            StartListening();
        }
        else if (command == "stop") {
            disposeListening();
        }
        else if (command == "status") {
            ShowStatus();
        }
        else if (command == "count") {
            std::cout << "事件计数: " << eventCount << std::endl;
        }
        else if (command == "clear") {
            ClearCount();
        }
        else if (command == "help") {
            ShowHelp();
        }
        else if (command == "autotest") {
            AutoTest();
        }
        else if (command == "exit" || command == "quit") {
            // 确保在退出前停止监听
            if (IsListening()) {
                std::cout << "正在停止监听..." << std::endl;
                disposeListening();
            }
            running = false;
            std::cout << "程序退出" << std::endl;
        }
        else if (!command.empty()) {
            std::cout << "未知命令: " << command << std::endl;
            std::cout << "输入 'help' 查看可用命令" << std::endl;
        }
    }

    return 0;
}