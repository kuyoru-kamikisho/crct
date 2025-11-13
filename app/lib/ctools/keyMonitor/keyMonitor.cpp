#include <openssl/sha.h>
#include <openssl/evp.h>
#include <iomanip>
#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <atomic>
#include <vector>
#include <sstream>
#include <mutex>
#include "InputHook.h"

// 添加WebSocket支持
#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iphlpapi.h>
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "iphlpapi.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <ifaddrs.h>
#include <netdb.h>
#endif

// 全局变量，用于统计事件数量
std::atomic<int> eventCount{ 0 };

// WebSocket相关全局变量
std::atomic<bool> wsMode{ false };
std::atomic<int> wsPort{ 0 };
std::atomic<SOCKET> wsServerSocket{ INVALID_SOCKET };
std::atomic<SOCKET> wsClientSocket{ INVALID_SOCKET };
std::atomic<bool> wsClientConnected{ false };
std::vector<std::string> wsMessageQueue;
std::mutex wsQueueMutex;

// 事件回调函数
void OnInputEvent(const char* eventStr) {
	eventCount++;
	std::string eventMessage = "[" + std::to_string(eventCount) + "] " + eventStr;

	// 控制台输出
	std::cout << eventMessage << std::endl;

	// WebSocket模式下的额外处理
	if (wsMode && wsClientConnected) {
		std::lock_guard<std::mutex> lock(wsQueueMutex);
		wsMessageQueue.push_back(eventMessage);
	}
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
	std::cout << "  ws     - 套接字通信模式" << std::endl;
	std::cout << "  help   - 显示此帮助信息" << std::endl;
	std::cout << "  exit   - 退出程序" << std::endl;
	std::cout << "==========================================" << std::endl;
	std::cout << "命令行用法:" << std::endl;
	std::cout << "  mo.exe -m <命令>          # 直接执行命令" << std::endl;
	std::cout << "  mo.exe -m ws -p <端口>    # WebSocket模式" << std::endl;
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
	if (wsMode) {
		std::cout << "WebSocket模式: 已启用 (端口: " << wsPort << ")" << std::endl;
		std::cout << "客户端连接: " << (wsClientConnected ? "已连接" : "未连接") << std::endl;
	}
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
void stopKeyMonitor() {
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

		stopKeyMonitor();
		std::cout << "自动测试结束" << std::endl;
		std::cout << "总共捕获 " << eventCount << " 个事件" << std::endl;
	}
	else {
		std::cout << "自动测试启动失败!" << std::endl;
	}
}

// 网络初始化
bool InitializeNetwork() {
#ifdef _WIN32
	WSADATA wsaData;
	int result = WSAStartup(MAKEWORD(2, 2), &wsaData);
	if (result != 0) {
		std::cout << "WSAStartup失败: " << result << std::endl;
		return false;
	}
#endif
	return true;
}

// 网络清理
void CleanupNetwork() {
#ifdef _WIN32
	WSACleanup();
#endif
}

// 获取本地IP地址（使用现代API）
std::string GetLocalIP() {
#ifdef _WIN32
	// Windows版本 - 使用getaddrinfo替代gethostbyname
	char hostname[256];
	if (gethostname(hostname, sizeof(hostname)) == 0) {
		struct addrinfo hints, * result, * ptr;
		memset(&hints, 0, sizeof(hints));
		hints.ai_family = AF_INET; // IPv4
		hints.ai_socktype = SOCK_STREAM;

		int error = getaddrinfo(hostname, NULL, &hints, &result);
		if (error == 0) {
			for (ptr = result; ptr != NULL; ptr = ptr->ai_next) {
				if (ptr->ai_family == AF_INET) {
					char ipstr[INET_ADDRSTRLEN];
					struct sockaddr_in* ipv4 = (struct sockaddr_in*)ptr->ai_addr;
					if (inet_ntop(AF_INET, &(ipv4->sin_addr), ipstr, sizeof(ipstr)) != NULL) {
						freeaddrinfo(result);
						return std::string(ipstr);
					}
				}
			}
			freeaddrinfo(result);
		}
	}
#else
	// Linux/Unix版本
	struct ifaddrs* ifaddr, * ifa;
	if (getifaddrs(&ifaddr) != -1) {
		for (ifa = ifaddr; ifa != NULL; ifa = ifa->ifa_next) {
			if (ifa->ifa_addr == NULL) continue;

			// 只关注IPv4
			if (ifa->ifa_addr->sa_family == AF_INET) {
				struct sockaddr_in* sa = (struct sockaddr_in*)ifa->ifa_addr;
				char ipstr[INET_ADDRSTRLEN];
				if (inet_ntop(AF_INET, &(sa->sin_addr), ipstr, sizeof(ipstr)) != NULL) {
					// 跳过回环地址
					if (strcmp(ipstr, "127.0.0.1") != 0) {
						freeifaddrs(ifaddr);
						return std::string(ipstr);
					}
				}
			}
		}
		freeifaddrs(ifaddr);
	}
#endif
	return "127.0.0.1";
}

// 发送WebSocket消息
void SendWSMessage(const std::string& message) {
	if (wsClientConnected && wsClientSocket != INVALID_SOCKET) {
		// 简单的WebSocket帧格式 (文本帧)
		std::vector<unsigned char> frame;
		frame.push_back(0x81); // FIN=1, 文本帧

		if (message.length() < 126) {
			frame.push_back(static_cast<unsigned char>(message.length()));
		}
		else if (message.length() < 65536) {
			frame.push_back(126);
			frame.push_back(static_cast<unsigned char>((message.length() >> 8) & 0xFF));
			frame.push_back(static_cast<unsigned char>(message.length() & 0xFF));
		}

		frame.insert(frame.end(), message.begin(), message.end());

		send(wsClientSocket, reinterpret_cast<const char*>(frame.data()), frame.size(), 0);
	}
}

// Base64编码函数
std::string base64_encode(const std::string& input) {
	const char base64_chars[] =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		"abcdefghijklmnopqrstuvwxyz"
		"0123456789+/";

	std::string output;
	int val = 0, valb = -6;
	for (unsigned char c : input) {
		val = (val << 8) + c;
		valb += 8;
		while (valb >= 0) {
			output.push_back(base64_chars[(val >> valb) & 0x3F]);
			valb -= 6;
		}
	}
	if (valb > -6) {
		output.push_back(base64_chars[((val << 8) >> (valb + 8)) & 0x3F]);
	}
	while (output.size() % 4) {
		output.push_back('=');
	}
	return output;
}

// 处理WebSocket握手
bool PerformWebSocketHandshake(SOCKET clientSocket) {
	char buffer[2048];
	int bytesReceived = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
	if (bytesReceived <= 0) {
		return false;
	}

	buffer[bytesReceived] = '\0';
	std::string request(buffer);

	// 检查是否是WebSocket升级请求
	if (request.find("Upgrade: websocket") == std::string::npos) {
		return false;
	}

	// 提取Sec-WebSocket-Key
	std::string websocketKey;
	size_t keyStart = request.find("Sec-WebSocket-Key: ");
	if (keyStart != std::string::npos) {
		keyStart += 19;
		size_t keyEnd = request.find("\r\n", keyStart);
		websocketKey = request.substr(keyStart, keyEnd - keyStart);
	}

	if (websocketKey.empty()) {
		return false;
	}

	// 生成Accept key (key + magic string, then SHA1, then base64)
	std::string magicString = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
	std::string combined = websocketKey + magicString;

	unsigned char sha1Hash[SHA_DIGEST_LENGTH];
	SHA1(reinterpret_cast<const unsigned char*>(combined.c_str()), combined.length(), sha1Hash);

	std::string acceptKey = base64_encode(std::string(reinterpret_cast<char*>(sha1Hash), SHA_DIGEST_LENGTH));

	// 发送握手响应
	std::string response =
		"HTTP/1.1 101 Switching Protocols\r\n"
		"Upgrade: websocket\r\n"
		"Connection: Upgrade\r\n"
		"Sec-WebSocket-Accept: " + acceptKey + "\r\n\r\n";

	if (send(clientSocket, response.c_str(), response.length(), 0) <= 0) {
		return false;
	}

	return true;
}

// 处理WebSocket客户端
void HandleWSClient() {
	// 执行WebSocket握手
	if (!PerformWebSocketHandshake(wsClientSocket)) {
		std::cout << "WebSocket握手失败" << std::endl;
		wsClientConnected = false;
		return;
	}

	std::cout << "WebSocket握手成功，连接已建立" << std::endl;

	// 发送欢迎消息
	SendWSMessage("WebSocket连接已建立");
	SendWSMessage("可用命令: start, stop, status, count, clear, exit");

	char buffer[1024];
	while (wsClientConnected) {
		// 发送队列中的消息
		{
			std::lock_guard<std::mutex> lock(wsQueueMutex);
			for (const auto& msg : wsMessageQueue) {
				SendWSMessage(msg);
			}
			wsMessageQueue.clear();
		}

		// 接收客户端消息
		int bytesReceived = recv(wsClientSocket, buffer, sizeof(buffer) - 1, 0);
		if (bytesReceived > 0) {
			buffer[bytesReceived] = '\0';
			std::string message(buffer);

			// 简单的WebSocket消息解析 (跳过掩码和帧头)
			if (message.length() >= 2) {
				size_t payloadLen = static_cast<unsigned char>(message[1]) & 0x7F;
				size_t headerSize = 2;

				if (payloadLen == 126) headerSize += 2;
				else if (payloadLen == 127) headerSize += 8;

				if (message.length() > headerSize + 4) {
					std::string actualMessage;
					for (size_t i = headerSize + 4; i < message.length(); i++) {
						actualMessage += message[i];
					}

					std::cout << "收到WebSocket命令: " << actualMessage << std::endl;
					SendWSMessage("命令已接收: " + actualMessage);

					// 处理命令
					if (actualMessage == "start") StartListening();
					else if (actualMessage == "stop") stopKeyMonitor();
					else if (actualMessage == "status") ShowStatus();
					else if (actualMessage == "count") SendWSMessage("事件计数: " + std::to_string(eventCount));
					else if (actualMessage == "clear") ClearCount();
					else if (actualMessage == "exit") {
						SendWSMessage("正在退出...");
						wsClientConnected = false;
						break;
					}
				}
			}
		}
		else {
			wsClientConnected = false;
			std::cout << "WebSocket客户端断开连接" << std::endl;
		}

		std::this_thread::sleep_for(std::chrono::milliseconds(100));
	}
}

// 启动WebSocket服务器
bool StartWSServer(int port) {
	if (!InitializeNetwork()) {
		return false;
	}

	// 创建服务器socket
	wsServerSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
	if (wsServerSocket == INVALID_SOCKET) {
		std::cout << "创建socket失败" << std::endl;
		return false;
	}

	// 设置socket选项
	int opt = 1;
#ifdef _WIN32
	setsockopt(wsServerSocket, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));
#else
	setsockopt(wsServerSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif

	// 绑定地址和端口
	sockaddr_in serverAddr;
	serverAddr.sin_family = AF_INET;
	serverAddr.sin_addr.s_addr = INADDR_ANY;
	serverAddr.sin_port = htons(port);

	if (bind(wsServerSocket, reinterpret_cast<sockaddr*>(&serverAddr), sizeof(serverAddr)) != 0) {
		std::cout << "绑定端口 " << port << " 失败" << std::endl;
#ifdef _WIN32
		closesocket(wsServerSocket);
#else
		close(wsServerSocket);
#endif
		wsServerSocket = INVALID_SOCKET;
		return false;
	}

	// 监听
	if (listen(wsServerSocket, 1) != 0) {
		std::cout << "监听失败" << std::endl;
#ifdef _WIN32
		closesocket(wsServerSocket);
#else
		close(wsServerSocket);
#endif
		wsServerSocket = INVALID_SOCKET;
		return false;
	}

	wsMode = true;
	wsPort = port;

	std::string localIP = GetLocalIP();
	std::cout << "WebSocket服务器已启动" << std::endl;
	std::cout << "服务地址: ws://" << localIP << ":" << port << std::endl;
	std::cout << "等待客户端连接..." << std::endl;

	// 接受客户端连接
	sockaddr_in clientAddr;
	socklen_t clientLen = sizeof(clientAddr);
	wsClientSocket = accept(wsServerSocket, reinterpret_cast<sockaddr*>(&clientAddr), &clientLen);

	if (wsClientSocket == INVALID_SOCKET) {
		std::cout << "接受客户端连接失败" << std::endl;
		return false;
	}

	char clientIP[INET_ADDRSTRLEN];
	inet_ntop(AF_INET, &clientAddr.sin_addr, clientIP, INET_ADDRSTRLEN);
	std::cout << "客户端已连接: " << clientIP << std::endl;

	wsClientConnected = true;

	// 发送欢迎消息
	SendWSMessage("WebSocket连接已建立");
	SendWSMessage("可用命令: start, stop, status, count, clear, exit");

	// 处理客户端通信
	HandleWSClient();

	// 清理
#ifdef _WIN32
	closesocket(wsClientSocket);
	closesocket(wsServerSocket);
#else
	close(wsClientSocket);
	close(wsServerSocket);
#endif
	wsClientSocket = INVALID_SOCKET;
	wsServerSocket = INVALID_SOCKET;
	wsClientConnected = false;
	wsMode = false;

	CleanupNetwork();
	return true;
	}

// 解析命令行参数
bool ParseCommandLine(int argc, char* argv[], std::string& mode, int& port) {
	for (int i = 1; i < argc; i++) {
		std::string arg = argv[i];
		if (arg == "-m" && i + 1 < argc) {
			mode = argv[++i];
		}
		else if (arg == "-p" && i + 1 < argc) {
			port = std::stoi(argv[++i]);
		}
		else if (arg == "--help" || arg == "-h") {
			ShowHelp();
			return false;
		}
	}
	return true;
}

// 主函数
int main(int argc, char* argv[]) {
	std::cout << "InputHook 本地测试程序" << std::endl;
	std::cout << "编译时间: " << __DATE__ << " " << __TIME__ << std::endl;

	// 命令行参数处理
	if (argc > 1) {
		std::string mode;
		int port = 0;

		if (!ParseCommandLine(argc, argv, mode, port)) {
			return 0;
		}

		if (!mode.empty()) {
			if (mode == "start") {
				StartListening();
				// 保持程序运行
				std::cout << "按回车键退出..." << std::endl;
				std::cin.get();
				if (IsListening()) {
					stopKeyMonitor();
				}
				return 0;
			}
			else if (mode == "stop") {
				stopKeyMonitor();
				return 0;
			}
			else if (mode == "status") {
				ShowStatus();
				return 0;
			}
			else if (mode == "count") {
				std::cout << "事件计数: " << eventCount << std::endl;
				return 0;
			}
			else if (mode == "clear") {
				ClearCount();
				return 0;
			}
			else if (mode == "ws") {
				if (port == 0) {
					std::cout << "WebSocket模式需要指定端口，使用 -p <端口号>" << std::endl;
					return 1;
				}
				if (!StartWSServer(port)) {
					std::cout << "WebSocket服务器启动失败，端口可能被占用" << std::endl;
					return 1;
				}
				return 0;
			}
			else if (mode == "help") {
				ShowHelp();
				return 0;
			}
			else {
				std::cout << "未知模式: " << mode << std::endl;
				ShowHelp();
				return 1;
			}
		}
	}

	// 原有的交互式模式
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
			stopKeyMonitor();
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
		else if (command == "ws") {
			std::cout << "请输入端口号: ";
			std::string portStr;
			std::getline(std::cin, portStr);
			try {
				int port = std::stoi(portStr);
				if (!StartWSServer(port)) {
					std::cout << "WebSocket服务器启动失败，端口可能被占用" << std::endl;
				}
			}
			catch (const std::exception& e) {
				std::cout << "无效的端口号: " << portStr << std::endl;
			}
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
				stopKeyMonitor();
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