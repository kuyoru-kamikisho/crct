import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import 'package:network_info_plus/network_info_plus.dart'; // 用于获取本机IP地址

// 定义 WebSocket 状态的枚举
enum WsStatus { connected, connecting, unconnect, failed }

class KeyMonitor with ChangeNotifier {
  Process? _process;
  String wsAddress = '';
  String errMessage = '';
  bool isRunning = false;
  WsStatus wsStatus = WsStatus.unconnect;
  WebSocketChannel? websocket;
  String wsMessage = '';
  String wsErrorMessage = '';

  // 启动 exe 程序
  Future<void> run(int port) async {
    try {
      // 获取本机IP地址
      final info = NetworkInfo();
      String? ipAddress = await info.getWifiIP();

      if (ipAddress == null) {
        errMessage = '无法获取本机IP地址';
        notifyListeners();
        return;
      }

      wsAddress = 'ws://$ipAddress:$port';
      _process = await Process.start('keyMonitor.exe', [
        '-m',
        'ws',
        '-p',
        '$port',
      ], mode: ProcessStartMode.detached);

      isRunning = true;
      errMessage = '';
      notifyListeners();
    } catch (e) {
      errMessage = '启动 exe 程序失败: $e';
      isRunning = false;
      notifyListeners();
    }
  }

  // 停止 exe 程序
  Future<void> stop() async {
    if (_process != null) {
      await _process?.kill();
      isRunning = false;
      notifyListeners();
    }
  }

  // 连接 WebSocket
  Future<void> connectWs() async {
    if (wsAddress.isEmpty) {
      wsStatus = WsStatus.failed;
      notifyListeners();
      return;
    }

    wsStatus = WsStatus.connecting;
    notifyListeners();

    try {
      websocket = IOWebSocketChannel.connect(wsAddress);
      websocket!.stream.listen(
        (message) {
          wsMessage += message + '\n';
          notifyListeners();
        },
        onError: (error) {
          wsErrorMessage = error.toString();
          notifyListeners();
        },
        onDone: () {
          wsStatus = WsStatus.unconnect;
          notifyListeners();
        },
      );

      // 连接成功后发送 "hello"
      websocket!.sink.add('hello');

      // 设置为已连接状态
      wsStatus = WsStatus.connected;
      notifyListeners();
    } catch (e) {
      wsStatus = WsStatus.failed;
      wsErrorMessage = 'WebSocket 连接失败: $e';
      notifyListeners();
    }
  }

  // 获取 WebSocket 状态
  WsStatus getStatus() {
    return wsStatus;
  }

  // 获取 WebSocket 消息
  String getMessage() {
    return wsMessage;
  }

  // 获取错误信息
  String getErrorMessage() {
    return wsErrorMessage;
  }

  // 获取进程的运行状态
  bool getProcessStatus() {
    return isRunning;
  }

  // 获取错误信息
  String getError() {
    return errMessage;
  }

  // 重置 WebSocket 错误消息
  void clearErrorMessage() {
    wsErrorMessage = '';
    notifyListeners();
  }
}
