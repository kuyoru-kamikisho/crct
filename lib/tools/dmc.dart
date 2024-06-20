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

class DmcClass {
  late String _libraryPath;
  late ffi.DynamicLibrary _dmcLib;
  late Isolate _selfIsolate;
  late double Function(int) getCpuUsage;
  late double Function() getMemoryUsage;
  late double Function() getDiskUsage;

  /// 用来将性能信息发送到该主线程接口
  late SendPort mainPort1;

  /// 自身线程接口
  late ReceivePort selfPort1;

  DmcClass({required this.mainPort1});

  /// 创建一个专用线程来获取电脑的性能信息
  ///
  /// 该方法在整个程序种只应该调用一次
  void spawn() async {
    _selfIsolate = await Isolate.spawn(dmcSelf, mainPort1);
  }

  void dmcSelf(SendPort mainp) {
    _libraryPath =
        path.join(Directory.current.path, 'plugins', 'dmc', 'dmc.so');
    if (Platform.isMacOS) {
      _libraryPath =
          path.join(Directory.current.path, 'plugins', 'dmc', 'dmc.dylib');
    } else if (Platform.isWindows) {
      _libraryPath =
          path.join(Directory.current.path, 'plugins', 'dmc', 'dmc.dll');
    }
    _dmcLib = ffi.DynamicLibrary.open(_libraryPath);

    getCpuUsage =
        _dmcLib.lookupFunction<GetCpuUsageC, GetCpuUsage>('GetCpuUsage');
    getMemoryUsage = _dmcLib
        .lookupFunction<GetMemoryUsageC, GetMemoryUsage>('GetMemoryUsage');
    getDiskUsage =
        _dmcLib.lookupFunction<GetDiskUsageC, GetDiskUsage>('GetDiskUsage');

    selfPort1 = ReceivePort();
    mainp.send(selfPort1.sendPort);

    selfPort1.listen((msg) {
      if (msg is String && msg == 'close') {
        selfPort1.close();
        _selfIsolate.kill();
      }
    });

    Timer.periodic(const Duration(microseconds: 1300), (timer) {
      var c = getCpuUsage(1000);
      var d = getDiskUsage();
      var m = getMemoryUsage();
      mainPort1.send({'c': c, 'd': d, 'm': m});
    });
  }
}
