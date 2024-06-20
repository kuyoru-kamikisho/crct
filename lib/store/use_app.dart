import 'dart:isolate';

import 'package:crct/tools/dmc.dart';
import 'package:flutter/foundation.dart';

class UseApp with ChangeNotifier, DiagnosticableTreeMixin {
  final String _version = '1.0.0';
  final ReceivePort _receivePort = ReceivePort();
  bool _isWatchingDevicePerformance = false;
  String _cpu = '0%';
  String _dsk = '0%';
  String _mem = '0%';

  String get version => _version;
  String get cpu => _cpu;
  String get disk => _dsk;
  String get memory => _mem;

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
}
