// keyMonitor.cpp
// WebSocket-stable version: keeps connection until client sends "exit".
// Only WS-related logic changed; InputHook logic is preserved.

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
#include <cstring>
#include <cstdint>

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
#include <fcntl.h>
#define INVALID_SOCKET (-1)
typedef int SOCKET;
#endif

// Global variables
std::atomic<int> eventCount{ 0 };

// WebSocket variables
std::atomic<bool> wsMode{ false };
std::atomic<int> wsPort{ 0 };
std::atomic<SOCKET> wsServerSocket{ INVALID_SOCKET };
std::atomic<SOCKET> wsClientSocket{ INVALID_SOCKET };
std::atomic<bool> wsClientConnected{ false };
std::vector<std::string> wsMessageQueue;
std::mutex wsQueueMutex;

// Forward declarations (InputHook functions exist in InputHook.cpp)
void OnInputEvent(const char* eventStr);
void ShowHelp();
void ShowStatus();
void ClearCount();
void StartListening();
void stopKeyMonitor();
void AutoTest();

// ---------------- InputHook callback ----------------
void OnInputEvent(const char* eventStr) {
	eventCount++;
	std::string eventMessage = "[" + std::to_string(eventCount) + "] " + eventStr;

	// Console output
	std::cout << eventMessage << std::endl;

	// If WS mode and client connected, queue message
	if (wsMode && wsClientConnected) {
		std::lock_guard<std::mutex> lock(wsQueueMutex);
		wsMessageQueue.push_back(eventMessage);
	}
}

// ---------------- Utility / UI ----------------
void ShowHelp() {
	std::cout << "==========================================" << std::endl;
	std::cout << "InputHook test program" << std::endl;
	std::cout << "==========================================" << std::endl;
	std::cout << "commands list:" << std::endl;
	std::cout << "  start  - Start monitoring input events" << std::endl;
	std::cout << "  stop   - Stop monitoring input events" << std::endl;
	std::cout << "  status - Display monitoring status" << std::endl;
	std::cout << "  count  - Display event count" << std::endl;
	std::cout << "  clear  - Clear event count" << std::endl;
	std::cout << "  ws     - Socket communication mode" << std::endl;
	std::cout << "  help   - Display this help information" << std::endl;
	std::cout << "  exit   - Exit the program" << std::endl;
	std::cout << "==========================================" << std::endl;
}

void ShowStatus() {
	bool isListening = IsListening();
	std::cout << "Monitoring status: " << (isListening ? "running" : "stopped") << std::endl;
	std::cout << "event count: " << eventCount << std::endl;
	if (wsMode) {
		std::cout << "WebSocket mode: enabled (port: " << wsPort << ")" << std::endl;
		std::cout << "Client connection: " << (wsClientConnected ? "connected" : "unconnected") << std::endl;
	}
}

void ClearCount() {
	eventCount = 0;
	std::cout << "event count cleared" << std::endl;
}

void StartListening() {
	if (IsListening()) {
		std::cout << "Monitoring is already running!" << std::endl;
		return;
	}

	if (StartListening(OnInputEvent)) {
		std::cout << "Start monitoring input events..." << std::endl;
		std::cout << "Please switch to another window for keyboard/mouse testing" << std::endl;
		std::cout << "Return to this window and enter 'stop' to stop listening" << std::endl;
	}
	else {
		std::cout << "Failed to start listening!" << std::endl;
	}
}

void stopKeyMonitor() {
	if (!IsListening()) {
		std::cout << "Monitoring is not running!" << std::endl;
		return;
	}

	StopListening();
	std::cout << "Stopped listening for input events" << std::endl;
	std::cout << "Captured total " << eventCount << " events" << std::endl;
}

void AutoTest() {
	std::cout << "Start automatic testing..." << std::endl;
	std::cout << "Start monitoring in 5 seconds..." << std::endl;

	std::this_thread::sleep_for(std::chrono::seconds(5));

	if (StartListening(OnInputEvent)) {
		std::cout << "Monitoring started; interact for 10 seconds..." << std::endl;
		std::this_thread::sleep_for(std::chrono::seconds(10));
		stopKeyMonitor();
		std::cout << "Automatic test ended" << std::endl;
		std::cout << "Captured " << eventCount << " events" << std::endl;
	}
	else {
		std::cout << "Automatic test failed to start" << std::endl;
	}
}

// ---------------- Network helpers ----------------
bool InitializeNetwork() {
#ifdef _WIN32
	WSADATA wsaData;
	int result = WSAStartup(MAKEWORD(2, 2), &wsaData);
	if (result != 0) {
		std::cout << "WSAStartup failed: " << result << std::endl;
		return false;
	}
#endif
	return true;
}

void CleanupNetwork() {
#ifdef _WIN32
	WSACleanup();
#endif
}

std::string GetLocalIP() {
#ifdef _WIN32
	char hostname[256];
	if (gethostname(hostname, sizeof(hostname)) == 0) {
		struct addrinfo hints, * result, * ptr;
		memset(&hints, 0, sizeof(hints));
		hints.ai_family = AF_INET;
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
	struct ifaddrs* ifaddr;
	struct ifaddrs* ifa;
	if (getifaddrs(&ifaddr) != -1) {
		for (ifa = ifaddr; ifa != NULL; ifa = ifa->ifa_next) {
			if (ifa->ifa_addr == NULL) continue;
			if (ifa->ifa_addr->sa_family == AF_INET) {
				struct sockaddr_in* sa = (struct sockaddr_in*)ifa->ifa_addr;
				char ipstr[INET_ADDRSTRLEN];
				if (inet_ntop(AF_INET, &(sa->sin_addr), ipstr, sizeof(ipstr)) != NULL) {
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
	return std::string("127.0.0.1");
}

// ---------------- Base64 for handshake ----------------
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

// ---------------- socket helpers ----------------
static bool recv_all(SOCKET s, void* buf, size_t len) {
	char* p = reinterpret_cast<char*>(buf);
	size_t received = 0;
	while (received < len) {
		int r = recv(s, p + received, static_cast<int>(len - received), 0);
		if (r <= 0) return false;
		received += static_cast<size_t>(r);
	}
	return true;
}

static bool send_all(SOCKET s, const void* buf, size_t len) {
	const char* p = reinterpret_cast<const char*>(buf);
	size_t sent = 0;
	while (sent < len) {
		int r = send(s, p + sent, static_cast<int>(len - sent), 0);
		if (r <= 0) return false;
		sent += static_cast<size_t>(r);
	}
	return true;
}

// ---------------- WebSocket send function (server->client) ----------------
void SendWSMessage(const std::string& message) {
	if (!wsClientConnected || wsClientSocket == INVALID_SOCKET) return;

	std::vector<unsigned char> frame;
	const size_t len = message.size();

	// FIN + text frame
	frame.push_back(0x81);

	if (len <= 125) {
		frame.push_back(static_cast<unsigned char>(len));
	}
	else if (len <= 0xFFFF) {
		frame.push_back(126);
		frame.push_back(static_cast<unsigned char>((len >> 8) & 0xFF));
		frame.push_back(static_cast<unsigned char>(len & 0xFF));
	}
	else {
		frame.push_back(127);
		for (int i = 7; i >= 0; --i) {
			frame.push_back(static_cast<unsigned char>((len >> (8 * i)) & 0xFF));
		}
	}

	frame.insert(frame.end(), message.begin(), message.end());
	send_all(wsClientSocket, frame.data(), frame.size());
}

// ---------------- Handshake ----------------
bool PerformWebSocketHandshake(SOCKET clientSocket) {
	std::string request;
	char buf[1024];
	while (true) {
		int r = recv(clientSocket, buf, sizeof(buf) - 1, 0);
		if (r <= 0) return false;
		buf[r] = '\0';
		request.append(buf, r);
		if (request.find("\r\n\r\n") != std::string::npos) break;
		if (request.size() > 16 * 1024) return false;
	}

	if (request.find("Upgrade: websocket") == std::string::npos &&
		request.find("upgrade: websocket") == std::string::npos) {
		return false;
	}

	std::string websocketKey;
	size_t keyPos = request.find("Sec-WebSocket-Key:");
	if (keyPos == std::string::npos) keyPos = request.find("sec-websocket-key:");
	if (keyPos != std::string::npos) {
		keyPos = request.find(':', keyPos);
		if (keyPos != std::string::npos) {
			keyPos++;
			while (keyPos < request.size() && (request[keyPos] == ' ' || request[keyPos] == '\t')) keyPos++;
			size_t eol = request.find("\r\n", keyPos);
			if (eol != std::string::npos) {
				websocketKey = request.substr(keyPos, eol - keyPos);
				while (!websocketKey.empty() && (websocketKey.back() == '\r' || websocketKey.back() == '\n' || websocketKey.back() == ' ')) websocketKey.pop_back();
			}
		}
	}
	if (websocketKey.empty()) return false;

	std::string magicString = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
	std::string combined = websocketKey + magicString;

	unsigned char sha1Hash[SHA_DIGEST_LENGTH];
	SHA1(reinterpret_cast<const unsigned char*>(combined.c_str()), combined.length(), sha1Hash);

	std::string acceptKey = base64_encode(std::string(reinterpret_cast<char*>(sha1Hash), SHA_DIGEST_LENGTH));

	std::ostringstream resp;
	resp << "HTTP/1.1 101 Switching Protocols\r\n";
	resp << "Upgrade: websocket\r\n";
	resp << "Connection: Upgrade\r\n";
	resp << "Sec-WebSocket-Accept: " << acceptKey << "\r\n\r\n";

	std::string response = resp.str();
	if (!send_all(clientSocket, response.data(), response.size())) {
		return false;
	}
	return true;
}

// ---------------- Read one WebSocket frame (blocking) ----------------
// Returns:
//  - true  : a text frame was read and outMessage contains payload
//  - true  : a control frame was processed (ping/pong) and outMessage may be empty
//  - false : connection closed or error
bool ReadWSFrame(SOCKET client, std::string& outMessage) {
	unsigned char header[2];
	if (!recv_all(client, header, 2)) return false;

	unsigned char b0 = header[0];
	unsigned char b1 = header[1];

	bool fin = (b0 & 0x80) != 0;
	unsigned char opcode = b0 & 0x0F;
	bool masked = (b1 & 0x80) != 0;
	uint64_t payloadLen = b1 & 0x7F;

	if (payloadLen == 126) {
		unsigned char ext[2];
		if (!recv_all(client, ext, 2)) return false;
		payloadLen = (static_cast<uint64_t>(ext[0]) << 8) | static_cast<uint64_t>(ext[1]);
	}
	else if (payloadLen == 127) {
		unsigned char ext[8];
		if (!recv_all(client, ext, 8)) return false;
		payloadLen = 0;
		for (int i = 0; i < 8; ++i) {
			payloadLen = (payloadLen << 8) | ext[i];
		}
	}

	unsigned char maskKey[4] = { 0 };
	if (masked) {
		if (!recv_all(client, maskKey, 4)) return false;
	}
	else {
		// According to RFC, client-to-server frames MUST be masked
		return false;
	}

	std::vector<unsigned char> payload;
	if (payloadLen > 0) {
		try {
			payload.resize(payloadLen);
		}
		catch (...) {
			return false;
		}
		if (!recv_all(client, payload.data(), payloadLen)) return false;
		for (uint64_t i = 0; i < payloadLen; ++i) {
			payload[i] ^= maskKey[i % 4];
		}
	}

	// Handle opcodes
	if (opcode == 0x8) {
		// Close frame: attempt to send a close in response (no payload required)
		unsigned char closeFrame[2] = { 0x88, 0x00 };
		send_all(client, closeFrame, 2);
		return false;
	}
	else if (opcode == 0x9) {
		// Ping -> send Pong with same payload
		std::vector<unsigned char> pong;
		pong.push_back(0x8A); // FIN + pong opcode (0xA)
		size_t plen = payload.size();
		if (plen <= 125) {
			pong.push_back(static_cast<unsigned char>(plen));
		}
		else if (plen <= 0xFFFF) {
			pong.push_back(126);
			pong.push_back(static_cast<unsigned char>((plen >> 8) & 0xFF));
			pong.push_back(static_cast<unsigned char>(plen & 0xFF));
		}
		else {
			pong.push_back(127);
			for (int i = 7; i >= 0; --i) pong.push_back(static_cast<unsigned char>((plen >> (8 * i)) & 0xFF));
		}
		pong.insert(pong.end(), payload.begin(), payload.end());
		send_all(client, pong.data(), pong.size());
		outMessage.clear();
		return true; // processed ping
	}
	else if (opcode == 0xA) {
		// Pong: ignore
		outMessage.clear();
		return true;
	}
	else if (opcode == 0x1) {
		// Text frame: return payload (assumed UTF-8)
		outMessage.assign(reinterpret_cast<char*>(payload.data()), payload.size());
		return true;
	}

	// other opcodes: ignore for now
	outMessage.clear();
	return true;
}

// ---------------- Main client handling loop (non-blocking via select) ----------------
void HandleWSClient() {
	std::cout << "WebSocket connected" << std::endl;

	// Send initial welcome messages (English UTF-8)
	SendWSMessage("WebSocket connected.");
	SendWSMessage("Commands available: start, stop, status, count, clear, exit");

	// Ensure wsClientConnected is true
	wsClientConnected = true;

	// Loop until client sends exit (which will set wsClientConnected=false) or socket error
	while (wsClientConnected) {
		// 1) Flush message queue first
		{
			std::lock_guard<std::mutex> lock(wsQueueMutex);
			for (const auto& msg : wsMessageQueue) {
				SendWSMessage(msg);
			}
			wsMessageQueue.clear();
		}

		// 2) Use select with timeout to wait for incoming data or timeout to re-loop
		fd_set readfds;
		FD_ZERO(&readfds);
		SOCKET s = wsClientSocket;
		FD_SET(s, &readfds);

		struct timeval tv;
		tv.tv_sec = 0;
		tv.tv_usec = 200 * 1000; // 200 ms

		int nfds = 0;
#ifdef _WIN32
		// on Windows, first param is ignored
		int sel = select(0, &readfds, NULL, NULL, &tv);
#else
		nfds = s + 1;
		int sel = select(nfds, &readfds, NULL, NULL, &tv);
#endif
		if (sel < 0) {
			// select error -> break
			wsClientConnected = false;
			break;
		}
		else if (sel == 0) {
			// timeout, loop again to flush queue / check flags
			continue;
		}
		else {
			if (FD_ISSET(s, &readfds)) {
				// There is data -> read frame(s)
				std::string received;
				bool ok = ReadWSFrame(s, received);
				if (!ok) {
					wsClientConnected = false;
					break;
				}
				if (!received.empty()) {
					// Normalize CRLF and trim spaces
					// Handle command
					std::string cmd = received;
					// trim
					while (!cmd.empty() && (cmd.back() == '\r' || cmd.back() == '\n' || cmd.back() == ' ')) cmd.pop_back();
					while (!cmd.empty() && (cmd.front() == '\r' || cmd.front() == '\n' || cmd.front() == ' ')) cmd.erase(0, 1);

					std::cout << "Received WebSocket command: " << cmd << std::endl;
					SendWSMessage("Command received: " + cmd);

					if (cmd == "start") {
						StartListening();
						SendWSMessage("Started listening");
					}
					else if (cmd == "stop") {
						stopKeyMonitor();
						SendWSMessage("Stopped listening");
					}
					else if (cmd == "status") {
						ShowStatus();
						// Also return status over ws directly
						SendWSMessage(std::string("Listening: ") + (IsListening() ? "true" : "false"));
						SendWSMessage(std::string("EventCount: ") + std::to_string(eventCount));
					}
					else if (cmd == "count") {
						SendWSMessage("Event count: " + std::to_string(eventCount));
					}
					else if (cmd == "clear") {
						ClearCount();
						SendWSMessage("Event count cleared");
					}
					else if (cmd == "help") {
						// send help text over ws
						SendWSMessage("Commands: start, stop, status, count, clear, help, exit");
					}
					else if (cmd == "exit") {
						SendWSMessage("Exiting as requested");
						wsClientConnected = false;
						break;
					}
					else {
						// Unknown command: echo back
						SendWSMessage("Unknown command: " + cmd);
					}
				}
			}
		}
	} // end while

	std::cout << "WebSocket client processing loop ends" << std::endl;
}

// ---------------- Start WebSocket server (single client blocking accept) ----------------
bool StartWSServer(int port) {
	if (!InitializeNetwork()) return false;

	SOCKET serverSock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
	if (serverSock == INVALID_SOCKET) {
		std::cout << "Failed to create socket" << std::endl;
		return false;
	}
	wsServerSocket = serverSock;

	int opt = 1;
	setsockopt(wsServerSocket, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));

	sockaddr_in serverAddr;
	memset(&serverAddr, 0, sizeof(serverAddr));
	serverAddr.sin_family = AF_INET;
	serverAddr.sin_addr.s_addr = INADDR_ANY;
	serverAddr.sin_port = htons(static_cast<uint16_t>(port));

	if (bind(wsServerSocket, reinterpret_cast<sockaddr*>(&serverAddr), sizeof(serverAddr)) != 0) {
		std::cout << "Bind port " << port << " failed" << std::endl;
#ifdef _WIN32
		closesocket(wsServerSocket);
#else
		close(wsServerSocket);
#endif
		wsServerSocket = INVALID_SOCKET;
		return false;
	}

	if (listen(wsServerSocket, 1) != 0) {
		std::cout << "Listen failed" << std::endl;
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
	std::cout << "WebSocket server started" << std::endl;
	std::cout << "Server address: ws://" << localIP << ":" << port << std::endl;
	std::cout << "Waiting for client connection..." << std::endl;

	sockaddr_in clientAddr;
	socklen_t clientLen = sizeof(clientAddr);
	SOCKET clientSock = accept(wsServerSocket, reinterpret_cast<sockaddr*>(&clientAddr), &clientLen);

	if (clientSock == INVALID_SOCKET) {
		std::cout << "Failed to accept client connection" << std::endl;
		return false;
	}

	char clientIP[INET_ADDRSTRLEN];
	inet_ntop(AF_INET, &clientAddr.sin_addr, clientIP, INET_ADDRSTRLEN);
	std::cout << "Client connected: " << clientIP << std::endl;

	// Perform handshake
	if (!PerformWebSocketHandshake(clientSock)) {
#ifdef _WIN32
		closesocket(clientSock);
#else
		close(clientSock);
#endif
		std::cout << "WebSocket handshake failed" << std::endl;
		return false;
	}

	wsClientSocket = clientSock;
	wsClientConnected = true;

	// Enter processing loop (blocks until exit or error)
	HandleWSClient();

	// Clean up sockets
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

// ---------------- CLI parsing ----------------
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

// ---------------- main ----------------
int main(int argc, char* argv[]) {
	std::cout << "InputHook local testing program" << std::endl;
	std::cout << "Compilation time: " << __DATE__ << " " << __TIME__ << std::endl;

	if (argc > 1) {
		std::string mode;
		int port = 0;

		if (!ParseCommandLine(argc, argv, mode, port)) {
			return 0;
		}

		if (!mode.empty()) {
			if (mode == "start") {
				StartListening();
				std::cout << "press Enter to abort..." << std::endl;
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
				std::cout << "event count: " << eventCount << std::endl;
				return 0;
			}
			else if (mode == "clear") {
				ClearCount();
				return 0;
			}
			else if (mode == "ws") {
				if (port == 0) {
					std::cout << "WebSocket mode requires specifying a port: -p <port>" << std::endl;
					return 1;
				}
				if (!StartWSServer(port)) {
					std::cout << "WebSocket server failed to start, port may be used" << std::endl;
					return 1;
				}
				return 0;
			}
			else if (mode == "help") {
				ShowHelp();
				return 0;
			}
			else {
				std::cout << "Unknown mode: " << mode << std::endl;
				ShowHelp();
				return 1;
			}
		}
	}

	// interactive CLI mode
	ShowHelp();

	std::string command;
	bool running = true;

	while (running) {
		std::cout << std::endl << "Please enter the command: ";
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
			std::cout << "Event Count: " << eventCount << std::endl;
		}
		else if (command == "clear") {
			ClearCount();
		}
		else if (command == "ws") {
			std::cout << "Please enter the port number: ";
			std::string portStr;
			std::getline(std::cin, portStr);
			try {
				int port = std::stoi(portStr);
				if (!StartWSServer(port)) {
					std::cout << "WebSocket server failed to start, port may be occupied" << std::endl;
				}
			}
			catch (const std::exception& e) {
				std::cout << "Invalid port number: " << portStr << std::endl;
			}
		}
		else if (command == "help") {
			ShowHelp();
		}
		else if (command == "autotest") {
			AutoTest();
		}
		else if (command == "exit" || command == "quit") {
			if (IsListening()) {
				std::cout << "Stopping listening .." << std::endl;
				stopKeyMonitor();
			}
			running = false;
			std::cout << "Program exit" << std::endl;
		}
		else if (!command.empty()) {
			std::cout << "Unknown command: " << command << std::endl;
			std::cout << "Enter 'help' to view available commands" << std::endl;
		}
	}

	return 0;
}
