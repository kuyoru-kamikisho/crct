import 'dart:io';

import 'package:flutter/foundation.dart';

import '../util.dart';

class LogService {
  LogService(this.directory);

  final String directory;
  Future<void> _tail = Future<void>.value();

  void info(String message) => _enqueue('INFO', message);
  void error(String message, [Object? error]) {
    final text = error == null ? message : '$message: $error';
    _enqueue('ERROR', text);
  }

  void _enqueue(String level, String message) {
    _tail = _tail.then((_) => _write(level, message)).catchError((Object _) {});
  }

  Future<void> _write(String level, String message) async {
    final now = DateTime.now();
    final line = '${_stamp(now)} $level $message\r\n';
    debugPrint(line.trimRight());
    final file = File(joinPath(directory, 'kacher-${_day(now)}.log'));
    await file.parent.create(recursive: true);
    await file.writeAsString(line, mode: FileMode.append, flush: true);
  }

  Future<void> purge(int retentionDays) async {
    final dir = Directory(directory);
    if (!await dir.exists()) return;
    final today = DateTime.now();
    final todayDay = DateTime(today.year, today.month, today.day);
    final pattern = RegExp(r'kacher-(\d{4})-(\d{2})-(\d{2})\.log$');
    await for (final entity in dir.list()) {
      if (entity is! File) continue;
      final name = entity.uri.pathSegments.isEmpty
          ? entity.path
          : entity.uri.pathSegments.last;
      final match = pattern.firstMatch(name);
      if (match == null) continue;
      final day = DateTime(
        int.parse(match.group(1)!),
        int.parse(match.group(2)!),
        int.parse(match.group(3)!),
      );
      if (todayDay.difference(day).inDays >= retentionDays) {
        try {
          await entity.delete();
        } catch (_) {}
      }
    }
  }

  static String _day(DateTime time) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${time.year}-${two(time.month)}-${two(time.day)}';
  }

  static String _stamp(DateTime time) {
    String two(int n) => n.toString().padLeft(2, '0');
    String three(int n) => n.toString().padLeft(3, '0');
    return '${_day(time)} ${two(time.hour)}:${two(time.minute)}:${two(time.second)}.${three(time.millisecond)}';
  }
}
