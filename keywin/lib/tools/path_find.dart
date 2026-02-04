import 'package:path_provider/path_provider.dart';
import 'dart:io';

class AppDirectory {
  // 获取应用安装目录（只读，应用更新时会覆盖）
  static Future<String> getAppInstallDirectory() async {
    return (await getApplicationSupportDirectory()).path;
  }

  // 获取应用文档目录（可读写，应用更新时保留）
  static Future<String> getAppDocumentsDirectory() async {
    return (await getApplicationDocumentsDirectory()).path;
  }

  // 获取临时目录（系统可能会清理）
  static Future<String> getTempDirectory() async {
    return (await getTemporaryDirectory()).path;
  }

  // 获取外部存储目录（Android）/ 共享目录
  static Future<String?> getExternalStorageDirectory() async {
    try {
      return await getExternalStorageDirectory();
    } catch (e) {
      return null;
    }
  }

  // 获取实际可执行文件所在目录（平台特定）
  static Future<String> getExecutableDirectory() async {
    final appDocDir = await getApplicationDocumentsDirectory();
    final path = appDocDir.path;

    // 根据不同平台获取实际安装目录
    if (Platform.isAndroid) {
      // Android: 应用安装目录在 /data/app/...
      // 但无法直接访问，通常使用应用支持目录
      return (await getApplicationSupportDirectory()).path;
    } else if (Platform.isIOS) {
      // iOS: 应用包目录
      return (await getLibraryDirectory()).path;
    } else if (Platform.isWindows) {
      // Windows: 使用运行目录
      return Directory.current.path;
    } else if (Platform.isMacOS) {
      // macOS: 应用包内的 Contents/Resources
      final bundlePath = await getApplicationSupportDirectory();
      return bundlePath.path;
    } else if (Platform.isLinux) {
      // Linux: 使用当前工作目录或用户目录
      return Directory.current.path;
    }
    return path;
  }
}
