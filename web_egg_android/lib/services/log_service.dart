import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;

import 'config_service.dart';

/// 按日写入本地日志文件。
class LogService {
  LogService._();
  static final LogService instance = LogService._();

  String? _logDir;

  Future<void> init({String? logPath}) async {
    _logDir = logPath ?? await ConfigService.instance.defaultLogPath();
    try {
      await Directory(_logDir!).create(recursive: true);
    } catch (e) {
      debugPrint('LogService.init mkdir error: $e');
    }
  }

  Future<void> setLogPath(String path) async {
    _logDir = path;
    try {
      await Directory(_logDir!).create(recursive: true);
    } catch (e) {
      debugPrint('LogService.setLogPath error: $e');
    }
  }

  String get logDir => _logDir ?? '';

  Future<File> _todayFile() async {
    final dir = _logDir ?? await ConfigService.instance.defaultLogPath();
    await Directory(dir).create(recursive: true);
    final now = DateTime.now();
    final name =
        'webegg_${now.year.toString().padLeft(4, '0')}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}.log';
    return File(p.join(dir, name));
  }

  Future<void> write(String message, {String level = 'INFO'}) async {
    try {
      final file = await _todayFile();
      final ts = DateTime.now().toIso8601String();
      final line = '[$ts][$level] $message\n';
      await file.writeAsString(line, mode: FileMode.append, flush: true);
    } catch (e) {
      debugPrint('LogService.write error: $e');
    }
  }

  Future<void> info(String message) => write(message, level: 'INFO');
  Future<void> warn(String message) => write(message, level: 'WARN');
  Future<void> error(String message) => write(message, level: 'ERROR');
}
