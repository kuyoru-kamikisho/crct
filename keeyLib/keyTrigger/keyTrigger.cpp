#include <iostream>
#include "programInfo.h"

int main(int argc, char* argv[]) {
    // argc 是参数的数量，argv 是参数的数组
    printerA("程序接收到 " + std::to_string(argc) + " 个参数。");
    // 遍历所有参数
    for (int i = 0; i < argc; ++i) {
        printerA("参数 " + std::to_string(i) + " : " + argv[i]);
    }
    printerA(getProgramPath());
    return 0;
}
