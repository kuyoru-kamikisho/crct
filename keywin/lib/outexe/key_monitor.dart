import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class KeyMonitorWsConnector extends ChangeNotifier {
  final String port = '7097';
  final String ip = '127.0.0.1';

  bool connected = false;
  WebSocketChannel? wsInstance;

  Function(String)? onMessage;

  String get wsAddress {
    return 'ws://$ip:$port';
  }

  Future<void> startConnectWs() async {
    try {
      wsInstance = WebSocketChannel.connect(Uri.parse(wsAddress));

      wsInstance!.stream.listen(
        (message) {
          if (onMessage != null) {
            onMessage!(message.toString());
          }
        },
        onError: (error) {
          print('WebSocket 监听错误: ${error.toString()}');
          _handleDisconnection();
        },
        onDone: () {
          print('WebSocket 连接关闭');
          _handleDisconnection();
        },
      );

      // 连接建立后立即发送消息
      Future.delayed(Duration.zero, () {
        connected = true;
        notifyListeners();
        wsInstance!.sink.add('start');
      });
    } catch (e) {
      print('WebSocket 连接失败catched: $e');
      _handleDisconnection();
      return; // 或者根据需求处理错误
    }
  }

  void _handleDisconnection() {
    print('已断开');
    connected = false;
    notifyListeners();
  }

  void runMonitor() {
    if (wsInstance != null && connected) {
      wsInstance!.sink.add('start');
    } else {
      print('WebSocket 未连接，无法发送消息');
    }
  }

  void closeMonitor() {
    try {
      wsInstance?.sink.add('exit');
    } catch (e) {
      print('发送 exit 命令失败: $e');
    } finally {
      _closeConnection();
    }
  }

  void _closeConnection() {
    try {
      wsInstance?.sink.close();
    } catch (e) {
      print('关闭 WebSocket 失败: $e');
    } finally {
      _handleDisconnection();
      wsInstance = null;
    }
  }

  @override
  void dispose() {
    _closeConnection();
    super.dispose();
  }
}
