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

// Add WebSocket support
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
#define INVALID_SOCKET (-1)
typedef int SOCKET;
#endif

// Global variable, used to count the number of events
std::atomic<int> eventCount{ 0 };

// WebSocket related global variables
std::atomic<bool> wsMode{ false };
std::atomic<int> wsPort{ 0 };
std::atomic<SOCKET> wsServerSocket{ INVALID_SOCKET };
std::atomic<SOCKET> wsClientSocket{ INVALID_SOCKET };
std::atomic<bool> wsClientConnected{ false };
std::vector<std::string> wsMessageQueue;
std::mutex wsQueueMutex;

// event callbacks 
void OnInputEvent(const char* eventStr) {
	eventCount++;
	std::string eventMessage = "[" + std::to_string(eventCount) + "] " + eventStr;

	// console output
	std::cout << eventMessage << std::endl;

	// Additional processing in WebSocket mode
	if (wsMode && wsClientConnected) {
		std::lock_guard<std::mutex> lock(wsQueueMutex);
		wsMessageQueue.push_back(eventMessage);
	}
}

// show help
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
	std::cout << "Command line usage:" << std::endl;
	std::cout << "  mo.exe -m <command>          # Directly execute commands" << std::endl;
	std::cout << "  mo.exe -m ws -p <port>    # WebSocket mode" << std::endl;
	std::cout << "==========================================" << std::endl;
	std::cout << "Before starting the test, please ensure that:" << std::endl;
	std::cout << "2. Switch to another window for input testing after the program runs" << std::endl;
	std::cout << "3. Low privilege programs may not be able to capture certain system keys" << std::endl;
	std::cout << "==========================================" << std::endl;
}

// Display monitoring status
void ShowStatus() {
	bool isListening = IsListening();
	std::cout << "Monitoring status: " << (isListening ? "running" : "stopped") << std::endl;
	std::cout << "event count: " << eventCount << std::endl;
	if (wsMode) {
		std::cout << "WebSocket mode: enabled (port: " << wsPort << ")" << std::endl;
		std::cout << "Client connection: " << (wsClientConnected ? "connected" : "unconnected") << std::endl;
	}
}

// Clear event count
void ClearCount() {
	eventCount = 0;
	std::cout << "event count cleared" << std::endl;
}

// Start monitoring
void StartListening() {
	if (IsListening()) {
		std::cout << "Monitoring is already running!" << std::endl;
		return;
	}

	if (StartListening(OnInputEvent)) {
		std::cout << "Start monitoring input events..." << std::endl;
		std::cout << "Please switch to another window for keyboard and mouse operation testing" << std::endl;
		std::cout << "Return to this window and enter 'top' to stop listening" << std::endl;
	}
	else {
		std::cout << "Failed to start listening!" << std::endl;
	}
}

// Stop monitoring
void stopKeyMonitor() {
	if (!IsListening()) {
		std::cout << "Monitoring is not running!" << std::endl;
		return;
	}

	StopListening();
	std::cout << "Stopped listening for input events" << std::endl;
	std::cout << "Total capture " << eventCount << " event" << std::endl;
}

// Automatic testing function
void AutoTest() {
	std::cout << "Start automatic testing..." << std::endl;
	std::cout << "Start monitoring in 5 seconds, please prepare for keyboard and mouse operation testing" << std::endl;

	std::this_thread::sleep_for(std::chrono::seconds(5));

	if (StartListening(OnInputEvent)) {
		std::cout << "Monitoring has started, please perform keyboard and mouse operations within 10 seconds..." << std::endl;
		std::cout << "Try pressing: A, B, C, Space, Enter, Backspace, etc" << std::endl;
		std::cout << "Try moving the mouse and clicking mouse buttons" << std::endl;

		// Monitor for 10 seconds
		std::this_thread::sleep_for(std::chrono::seconds(10));

		stopKeyMonitor();
		std::cout << "Automatic testing has ended" << std::endl;
		std::cout << "Captured " << eventCount << " event" << std::endl;
	}
	else {
		std::cout << "Automatic test startup failed!" << std::endl;
	}
}

// network initialization
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

// Network Cleanup
void CleanupNetwork() {
#ifdef _WIN32
	WSACleanup();
#endif
}

// Get local IP address (using modern APIs)
std::string GetLocalIP() {
#ifdef _WIN32
	// Windows version - using getaaddrinfo instead of gethostbyname
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
	// Linux/Unix version
	struct ifaddrs* ifaddr, * ifa;
	if (getifaddrs(&ifaddr) != -1) {
		for (ifa = ifaddr; ifa != NULL; ifa = ifa->ifa_next) {
			if (ifa->ifa_addr == NULL) continue;

			// Only focus on IPv4
			if (ifa->ifa_addr->sa_family == AF_INET) {
				struct sockaddr_in* sa = (struct sockaddr_in*)ifa->ifa_addr;
				char ipstr[INET_ADDRSTRLEN];
				if (inet_ntop(AF_INET, &(sa->sin_addr), ipstr, sizeof(ipstr)) != NULL) {
					// Skip loopback address
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

// Base64 encoding function
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

// Assist: Ensure that the specified length is read from the socket (handle TCP packet splitting)
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

// Send all data
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

// Send WebSocket text frames (server ->client, no mask required)
void SendWSMessage(const std::string& message) {
	if (!wsClientConnected || wsClientSocket == INVALID_SOCKET) return;

	std::vector<unsigned char> frame;
	const size_t len = message.size();

	// first byte: FIN + opcode (text)
	frame.push_back(0x81);

	// payload length
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
		// 8 bytes length (network byte order)
		for (int i = 7; i >= 0; --i) {
			frame.push_back(static_cast<unsigned char>((len >> (8 * i)) & 0xFF));
		}
	}

	// append payload
	frame.insert(frame.end(), message.begin(), message.end());

	// send all
	send_all(wsClientSocket, frame.data(), frame.size());
}

// Handle handshake (read requests more robustly)
bool PerformWebSocketHandshake(SOCKET clientSocket) {
	// Read HTTP request header (until \ r \ n \ r \ n), note that it may be unpacked and read multiple times
	std::string request;
	char buf[1024];
	while (true) {
		int r = recv(clientSocket, buf, sizeof(buf) - 1, 0);
		if (r <= 0) return false;
		buf[r] = '\0';
		request.append(buf, r);
		if (request.find("\r\n\r\n") != std::string::npos) break;
		// Protective: If the head is too large, it will fail
		if (request.size() > 16 * 1024) return false;
	}

	// Check the Upgrade field
	if (request.find("Upgrade: websocket") == std::string::npos &&
		request.find("upgrade: websocket") == std::string::npos) {
		return false;
	}

	// get Sec-WebSocket-Key
	std::string websocketKey;
	size_t keyPos = request.find("Sec-WebSocket-Key:");
	if (keyPos == std::string::npos) {
		// Also try lowercase form
		keyPos = request.find("sec-websocket-key:");
	}
	if (keyPos != std::string::npos) {
		keyPos = request.find(':', keyPos);
		if (keyPos != std::string::npos) {
			keyPos++;
			// skip space
			while (keyPos < request.size() && (request[keyPos] == ' ' || request[keyPos] == '\t')) keyPos++;
			size_t eol = request.find("\r\n", keyPos);
			if (eol != std::string::npos) {
				websocketKey = request.substr(keyPos, eol - keyPos);
				// trim
				while (!websocketKey.empty() && (websocketKey.back() == '\r' || websocketKey.back() == '\n' || websocketKey.back() == ' ')) websocketKey.pop_back();
			}
		}
	}

	if (websocketKey.empty()) return false;

	// generate Accept key
	std::string magicString = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
	std::string combined = websocketKey + magicString;

	unsigned char sha1Hash[SHA_DIGEST_LENGTH];
	SHA1(reinterpret_cast<const unsigned char*>(combined.c_str()), combined.length(), sha1Hash);

	std::string acceptKey = base64_encode(std::string(reinterpret_cast<char*>(sha1Hash), SHA_DIGEST_LENGTH));

	// Send handshake response
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

// Read and parse a complete WebSocket frame from the browser (return true and assign the text to outMessage)
// Currently, only text frames (opcode 0x1) and control shutdown are supported
bool ReadWSFrame(SOCKET client, std::string& outMessage) {
	unsigned char header[2];
	if (!recv_all(client, header, 2)) return false;

	bool fin = (header[0] & 0x80) != 0;
	unsigned char opcode = header[0] & 0x0F;
	bool masked = (header[1] & 0x80) != 0;
	uint64_t payloadLen = header[1] & 0x7F;

	// Extended length
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

	// Mask key must exist (must be masked when the browser sends frames)
	unsigned char maskKey[4] = { 0 };
	if (masked) {
		if (!recv_all(client, maskKey, 4)) return false;
	}
	else {
		// Browsers should always be masked; If not, it is considered a protocol error
		return false;
	}

	// Payload reading (PayloadLen may be very large, be careful)
	std::vector<unsigned char> payload;
	if (payloadLen > 0) {
		try {
			payload.resize(payloadLen);
		}
		catch (...) {
			return false;
		}
		if (!recv_all(client, payload.data(), payloadLen)) return false;
		// decode mask
		for (uint64_t i = 0; i < payloadLen; ++i) {
			payload[i] ^= maskKey[i % 4];
		}
	}

	// Process opcode
	if (opcode == 0x8) {
		// close frame
		return false; // Return false to indicate connection closure
	}
	else if (opcode == 0x1) {
		// Text frame
		outMessage.assign(reinterpret_cast<char*>(payload.data()), payload.size());
		return true;
	}
	else if (opcode == 0x9) {
		// ping -> response pong
		// send pong (payload copy) directly
		std::vector<unsigned char> pongFrame;
		pongFrame.push_back(0x8A); // FIN + opcode pong (0xA)
		size_t plen = payload.size();
		if (plen <= 125) {
			pongFrame.push_back(static_cast<unsigned char>(plen));
		}
		else if (plen <= 0xFFFF) {
			pongFrame.push_back(126);
			pongFrame.push_back(static_cast<unsigned char>((plen >> 8) & 0xFF));
			pongFrame.push_back(static_cast<unsigned char>(plen & 0xFF));
		}
		else {
			pongFrame.push_back(127);
			for (int i = 7; i >= 0; --i) pongFrame.push_back(static_cast<unsigned char>((plen >> (8 * i)) & 0xFF));
		}
		pongFrame.insert(pongFrame.end(), payload.begin(), payload.end());
		send_all(client, pongFrame.data(), pongFrame.size());
		return true; // continue loop
	}
	// Other opcodes are currently not supported (extensible)
	return true;
}

// Handling WebSocket client main loop
void HandleWSClient() {
	// Handshake completed in StartWSServer and wsClientConnected set to true
	std::cout << "WebSocket connected" << std::endl;

	// Send a welcome message
	SendWSMessage("WebSocket connected.");
	SendWSMessage("Commands available: start, stop, status, count, clear, exit");

	// Main loop: send queue+read client frames
	while (wsClientConnected) {
		// Sending messages in the queue
		{
			std::lock_guard<std::mutex> lock(wsQueueMutex);
			for (const auto& msg : wsMessageQueue) {
				SendWSMessage(msg);
			}
			wsMessageQueue.clear();
		}

		// Non blocking waiting reception: We will block the reading of a frame (ReadWSFrame will handle unpacking)
		std::string received;
		bool ok = ReadWSFrame(wsClientSocket, received);
		if (!ok) {
			// Read failed or client request to close
			wsClientConnected = false;
			break;
		}

		// If an empty string is received (e.g. only ping/ong without payload), continue
		if (!received.empty()) {
			std::cout << "Received WebSocket command: " << received << std::endl;
			SendWSMessage("Command received: " + received);

			// process command
			if (received == "start") StartListening();
			else if (received == "stop") stopKeyMonitor();
			else if (received == "status") ShowStatus();
			else if (received == "count") SendWSMessage("event count: " + std::to_string(eventCount));
			else if (received == "clear") ClearCount();
			else if (received == "exit") {
				SendWSMessage("exitting...");
				wsClientConnected = false;
				break;
			}
		}

		// Napping to reduce CPU usage (adjustable)
		std::this_thread::sleep_for(std::chrono::milliseconds(10));
	}

	std::cout << "WebSocket client processing loop ends" << std::endl;
}

// Start WebSocket server (blocking, single client)
bool StartWSServer(int port) {
	if (!InitializeNetwork()) return false;

	// Create server socket
	SOCKET serverSock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
	if (serverSock == INVALID_SOCKET) {
		std::cout << "Failed to create socket" << std::endl;
		return false;
	}
	wsServerSocket = serverSock;

	int opt = 1;
	setsockopt(wsServerSocket, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));

	// bind
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
		std::cout << "Monitoring failed" << std::endl;
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

	// Accept client (blocking)
	sockaddr_in clientAddr;
	socklen_t clientLen = sizeof(clientAddr);
	SOCKET clientSock = accept(wsServerSocket, reinterpret_cast<sockaddr*>(&clientAddr), &clientLen);

	if (clientSock == INVALID_SOCKET) {
		std::cout << "Failed to accept client connection" << std::endl;
		return false;
	}

	char clientIP[INET_ADDRSTRLEN];
	inet_ntop(AF_INET, &clientAddr.sin_addr, clientIP, INET_ADDRSTRLEN);
	std::cout << "The client has been connected: " << clientIP << std::endl;

	// handshake
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

	// Enter the processing loop (this function will block until the client disconnects)
	HandleWSClient();

	// Clean handle
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

// Analyze command-line parameters
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

// main function
int main(int argc, char* argv[]) {
	std::cout << "InputHook local testing program" << std::endl;
	std::cout << "Compilation time: " << __DATE__ << " " << __TIME__ << std::endl;

	// Command line parameter processing
	if (argc > 1) {
		std::string mode;
		int port = 0;

		if (!ParseCommandLine(argc, argv, mode, port)) {
			return 0;
		}

		if (!mode.empty()) {
			if (mode == "start") {
				StartListening();
				// Keep the program running
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
					std::cout << "WebSocket mode requires specifying a port, using - p<port number>" << std::endl;
					return 1;
				}
				if (!StartWSServer(port)) {
					std::cout << "WebSocket server failed to start, port may be occupied" << std::endl;
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

	// The original interactive mode
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
			// Ensure to stop listening before exiting
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
