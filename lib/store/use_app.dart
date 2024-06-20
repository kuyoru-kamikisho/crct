import 'dart:async';
import 'dart:isolate';
import 'package:crct/tools/dmc.dart';
import 'package:crct/tools/leaf.dart';
import 'package:flutter/foundation.dart';

class UseApp with ChangeNotifier, DiagnosticableTreeMixin {
  final String _version = '1.0.0';
  final ReceivePort _receivePort = ReceivePort();
  bool _isWatchingDevicePerformance = false;

  String _cpu = '0%';
  String _dsk = '0%';
  String _mem = '0%';
  String _year = '_';
  String _month = '_';
  String _day = '_';
  String _hour = '_';
  String _minute = '_';
  String _second = '_';
  String _week = '_';

  String get version => _version;
  String get cpu => _cpu;
  String get disk => _dsk;
  String get memory => _mem;
  String get year => _year;
  String get month => _month;
  String get day => _day;
  String get hour => _hour;
  String get minute => _minute;
  String get second => _second;
  String get week => _week;

  void watchDevicePerformance() {
    if (_isWatchingDevicePerformance) {
      return;
    }
    _isWatchingDevicePerformance = true;
    _receivePort.listen((d) {
      if (d is Map<String, double>) {
        _cpu = '${d['c']!.toStringAsFixed(2)}%';
        _dsk = '${d['d']!.toStringAsFixed(2)}%';
        _mem = '${d['m']!.toStringAsFixed(2)}%';
        notifyListeners();
      }
    });
    var dmc = DmcClass(mainPort1: _receivePort.sendPort);
    dmc.spawn();
  }

  void watchTime() async {
    Timer.periodic(const Duration(seconds: 1), (timer) {
      DateTime now = DateTime.now();
      _year = '${now.year}';
      _month = '${now.month}';
      _day = '${now.day}';
      _hour = padZero(now.hour);
      _minute = padZero(now.minute);
      _second = padZero(now.second);
      _week = jpWeekdays[now.weekday]!;
      notifyListeners();
    });
  }
}
