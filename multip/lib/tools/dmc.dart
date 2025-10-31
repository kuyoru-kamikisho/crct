import 'dart:async';
import 'dart:ffi' as ffi;
import 'dart:io' show Platform, Directory;
import 'dart:isolate';
import 'package:path/path.dart' as path;

typedef GetCpuUsageC = ffi.Float Function(ffi.Int32 milliseconds);
typedef GetCpuUsage = double Function(int milliseconds);

typedef GetDiskUsageC = ffi.Float Function();
typedef GetDiskUsage = double Function();

typedef GetMemoryUsageC = ffi.Float Function();
typedef GetMemoryUsage = double Function();

typedef GetBatteryStatusC = ffi.Int Function();
typedef GetBatteryStatus = int Function();

class DmcClass {
  final SendPort mainPort1;
  Isolate? _selfIsolate;
  ReceivePort? _mainReceivePort;

  DmcClass({required this.mainPort1});

  /// 创建一个专用线程来获取电脑的性能信息
  ///
  /// 该方法在整个程序中只应该调用一次
  Future<void> spawn() async {
    final receivePort = ReceivePort();
    _selfIsolate = await Isolate.spawn(_isolateEntry, receivePort.sendPort);

    // 等待隔离初始化完成并返回其SendPort
    final completer = Completer<SendPort>();
    late StreamSubscription subscription;
    subscription = receivePort.listen((message) {
      if (message is SendPort) {
        completer.complete(message);
        subscription.cancel();
      }
    });

    final isolateSendPort = await completer.future;

    // 将主线程的SendPort发送到隔离
    isolateSendPort.send(mainPort1);

    // 保存主线程的ReceivePort用于后续通信
    _mainReceivePort = receivePort;
  }

  /// 关闭隔离并清理资源
  Future<void> close() async {
    if (_selfIsolate != null) {
      _selfIsolate?.kill(priority: Isolate.immediate);
      _selfIsolate = null;
    }
    _mainReceivePort?.close();
    _mainReceivePort = null;
  }

  /// 隔离入口点
  static void _isolateEntry(SendPort mainSendPort) {
    final isolate = _DmcIsolate();
    isolate._initialize(mainSendPort);
  }
}

/// 隔离内部实现类
class _DmcIsolate {
  late ffi.DynamicLibrary _dmcLib;
  late double Function(int) getCpuUsage;
  late double Function() getMemoryUsage;
  late double Function() getDiskUsage;
  late int Function() getBatteryStatus;
  late ReceivePort _selfReceivePort;
  Timer? _timer;

  void _initialize(SendPort mainSendPort) {
    // 设置隔离内部的通信端口
    _selfReceivePort = ReceivePort();

    // 首先向主线程发送隔离的SendPort
    mainSendPort.send(_selfReceivePort.sendPort);

    // 等待主线程的SendPort
    _selfReceivePort.listen((message) {
      if (message is SendPort) {
        // 收到主线程的SendPort，开始初始化库和定时器
        _initializeLibrary();
        _startTimer(message);
      } else if (message == 'close') {
        // 关闭隔离
        _cleanup();
      }
    });
  }

  void _initializeLibrary() {
    String libraryPath;

    if (Platform.isMacOS) {
      libraryPath = path.join(
        Directory.current.path,
        'plugins',
        'dmc',
        'dmc.dylib',
      );
    } else if (Platform.isWindows) {
      libraryPath = path.join(
        Directory.current.path,
        'plugins',
        'dmc',
        'dmc.dll',
      );
    } else {
      libraryPath = path.join(
        Directory.current.path,
        'plugins',
        'dmc',
        'dmc.so',
      );
    }

    _dmcLib = ffi.DynamicLibrary.open(libraryPath);

    getCpuUsage = _dmcLib.lookupFunction<GetCpuUsageC, GetCpuUsage>(
      'GetCpuUsage',
    );
    getMemoryUsage = _dmcLib.lookupFunction<GetMemoryUsageC, GetMemoryUsage>(
      'GetMemoryUsage',
    );
    getDiskUsage = _dmcLib.lookupFunction<GetDiskUsageC, GetDiskUsage>(
      'GetDiskUsage',
    );
    getBatteryStatus = _dmcLib
        .lookupFunction<GetBatteryStatusC, GetBatteryStatus>(
          'GetBatteryStatus',
        );
  }

  void _startTimer(SendPort mainPort) {
    _timer = Timer.periodic(const Duration(microseconds: 1600), (timer) {
      final c = getCpuUsage(1600);
      final d = getDiskUsage();
      final m = getMemoryUsage();
      final b = getBatteryStatus();
      mainPort.send({'c': c, 'd': d, 'm': m, 'b': b});
    });
  }

  void _cleanup() {
    _timer?.cancel();
    _timer = null;
    _selfReceivePort.close();
  }
}
