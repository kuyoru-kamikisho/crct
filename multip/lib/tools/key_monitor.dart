import 'dart:ffi' as ffi;
import 'dart:io' show Platform, Directory;
import 'dart:isolate';
import 'package:ffi/ffi.dart';
import 'package:path/path.dart' as path;

// C函数类型定义
typedef StartListeningC =
    ffi.Int32 Function(
      ffi.Pointer<ffi.NativeFunction<EventCallbackC>> callback,
    );
typedef StartListening =
    int Function(ffi.Pointer<ffi.NativeFunction<EventCallbackC>> callback);

typedef StopListeningC = ffi.Void Function();
typedef StopListening = void Function();

typedef IsListeningC = ffi.Int32 Function();
typedef IsListening = int Function();

// 回调函数类型定义
typedef EventCallbackC = ffi.Void Function(ffi.Pointer<ffi.Int8> eventStr);
typedef EventCallbackDart = void Function(ffi.Pointer<ffi.Int8> eventStr);

class KeyMonitor {
  late String _libraryPath;
  late ffi.DynamicLibrary _keyMonitorLib;
  late Isolate selfIsolate;
  late StartListening _startListening;
  late StopListening _stopListening;
  late IsListening _isListening;

  /// 用来将信息发送到该主线程接口
  late SendPort mainPort1;

  /// 自身线程接口
  late ReceivePort selfPort1;

  // 保存回调指针，避免被GC
  late ffi.Pointer<ffi.NativeFunction<EventCallbackC>> _callbackPointer;

  // 静态引用，用于在静态回调中访问实例
  static KeyMonitor? _currentInstance;

  KeyMonitor({required this.mainPort1});

  /// 创建一个专用线程来持续监听键盘操作
  void spawn() async {
    selfIsolate = await Isolate.spawn(_isolateEntry, mainPort1);
  }

  /// 隔离体入口点
  static void _isolateEntry(SendPort mainPort) {
    final monitor = KeyMonitor._internal(mainPort);
    monitor._initializeInIsolate();
  }

  /// 内部构造函数，用于在隔离体中创建实例
  KeyMonitor._internal(this.mainPort1);

  /// 在隔离体中初始化
  void _initializeInIsolate() {
    // 设置当前实例引用
    _currentInstance = this;

    _loadLibrary();
    _setupCallbacks();
    _setupMessageHandling();
  }

  /// 加载动态库
  void _loadLibrary() {
    _libraryPath = path.join(
      Directory.current.path,
      'plugins',
      'keys',
      'keyMonitor.so',
    );
    if (Platform.isMacOS) {
      _libraryPath = path.join(
        Directory.current.path,
        'plugins',
        'keys',
        'keyMonitor.dylib',
      );
    } else if (Platform.isWindows) {
      _libraryPath = path.join(
        Directory.current.path,
        'plugins',
        'keys',
        'keyMonitor.dll',
      );
    }
    _keyMonitorLib = ffi.DynamicLibrary.open(_libraryPath);

    _startListening = _keyMonitorLib
        .lookupFunction<StartListeningC, StartListening>('StartListening');
    _stopListening = _keyMonitorLib
        .lookupFunction<StopListeningC, StopListening>('StopListening');
    _isListening = _keyMonitorLib.lookupFunction<IsListeningC, IsListening>(
      'IsListening',
    );
  }

  void _setupCallbacks() {
    // 使用静态函数创建回调指针
    _callbackPointer = ffi.Pointer.fromFunction<EventCallbackC>(_onEventStatic);
  }

  /// 静态事件回调函数 - 现在在隔离体内部
  static void _onEventStatic(ffi.Pointer<ffi.Int8> eventStr) {
    try {
      // 通过静态引用调用实例方法
      _currentInstance?._onEvent(eventStr);
    } catch (e) {
      print('Error in static event callback: $e');
    }
  }

  /// 实例事件回调函数
  void _onEvent(ffi.Pointer<ffi.Int8> eventStr) {
    try {
      String event = eventStr.cast<Utf8>().toDartString();
      print('Input Event in Isolate: $event');

      // 直接处理事件，因为我们在正确的隔离体中
      _handleNativeEvent(event);
    } catch (e) {
      print('Error processing event in callback: $e');
    }
  }

  /// 处理来自原生的事件
  void _handleNativeEvent(String event) {
    // 通过SendPort发送给主线程
    mainPort1.send({'type': 'key_event', 'data': event});
  }

  /// 设置消息处理
  void _setupMessageHandling() {
    selfPort1 = ReceivePort();
    // 发送接收端口给主线程
    mainPort1.send({'type': 'port', 'port': selfPort1.sendPort});

    selfPort1.listen((msg) {
      if (msg is String && msg == 'close') {
        _cleanup();
      } else if (msg is Map) {
        _handleMessage(msg);
      }
    });
  }

  /// 处理消息
  void _handleMessage(Map msg) {
    switch (msg['type']) {
      case 'start':
        startListening();
        break;
      case 'stop':
        stopListening();
        break;
      case 'status':
        final status = isListening();
        mainPort1.send({'type': 'status', 'listening': status});
        break;
    }
  }

  /// 清理资源
  void _cleanup() {
    stopListening();
    selfPort1.close();
    // 清除静态引用
    _currentInstance = null;
    mainPort1.send({'type': 'closed'});
    // 注意：这里不能关闭隔离体自身，由创建者负责
  }

  /// 开始监听
  bool startListening() {
    try {
      final result = _startListening(_callbackPointer);
      print('Start listening result: $result');
      return result != 0;
    } catch (e) {
      print('Error starting listener: $e');
      return false;
    }
  }

  /// 停止监听
  void stopListening() {
    try {
      _stopListening();
      print('Stop listening called');
    } catch (e) {
      print('Error stopping listener: $e');
    }
  }

  /// 检查是否在监听
  bool isListening() {
    try {
      final result = _isListening();
      return result != 0;
    } catch (e) {
      print('Error checking listener status: $e');
      return false;
    }
  }
}

class KeyMonitorManager {
  final ReceivePort _keyMonitorPort = ReceivePort();
  SendPort? _portOfMonitor;
  KeyMonitor? _keyMonitorInstance;
  bool _isRunning = false;
  bool _isMonitoring = false;

  void start() {
    if (_isRunning) return;

    _keyMonitorInstance = KeyMonitor(mainPort1: _keyMonitorPort.sendPort);
    _keyMonitorInstance?.spawn();

    _keyMonitorPort.listen(_handleMessage);
    _isRunning = true;
  }

  void _handleMessage(dynamic message) {
    if (message is Map) {
      switch (message['type']) {
        case 'port':
          _portOfMonitor = message['port'] as SendPort;
          print('Key monitor port received');
          // 等待一小段时间确保隔离体完全初始化
          Future.delayed(Duration(milliseconds: 100), () {
            if (_isMonitoring) {
              _sendStartCommand();
            }
          });
          break;
        case 'key_event':
          _onKeyEvent(message['data'] as String);
          break;
        case 'closed':
          print('Key monitor closed');
          _cleanup();
          break;
        case 'status':
          print('Listening status: ${message['listening']}');
          break;
      }
    }
  }

  void _onKeyEvent(String event) {
    if (_isMonitoring) {
      print('Key event: $event');
      // 在这里处理键盘事件
    }
  }

  /// 开始/恢复监听
  void startMonitoring() {
    if (!_isRunning) {
      start();
    }

    _isMonitoring = true;

    if (_portOfMonitor != null) {
      _sendStartCommand();
    }
  }

  /// 停止监听（但不关闭隔离体）
  void stopMonitoring() {
    _isMonitoring = false;

    if (_portOfMonitor != null) {
      _sendStopCommand();
    }
  }

  /// 完全停止并清理资源
  void stop() {
    if (_portOfMonitor != null) {
      _portOfMonitor!.send('close');
    } else {
      _cleanup();
    }
  }

  void _sendStartCommand() {
    _portOfMonitor?.send({'type': 'start'});
    print('Start monitoring command sent');
  }

  void _sendStopCommand() {
    _portOfMonitor?.send({'type': 'stop'});
    print('Stop monitoring command sent');
  }

  void _cleanup() {
    _keyMonitorInstance = null;
    _portOfMonitor = null;
    _isRunning = false;
    _isMonitoring = false;
  }

  void dispose() {
    stop();
    _keyMonitorPort.close();
  }

  // 检查当前状态
  bool get isMonitoring => _isMonitoring;
  bool get isRunning => _isRunning;

  // 发送状态查询
  void checkStatus() {
    if (_portOfMonitor != null) {
      _portOfMonitor!.send({'type': 'status'});
    }
  }
}
