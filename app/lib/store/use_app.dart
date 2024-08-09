import 'dart:isolate';
import 'package:crct/tools/dmc.dart';
import 'package:flutter/foundation.dart';

class UseApp with ChangeNotifier, DiagnosticableTreeMixin {
  final String _version = '1.0.0';
  final ReceivePort _receivePort = ReceivePort();
  bool _isWatchingDevicePerformance = false;

  double _cpu = 0;
  double _dsk = 0;
  double _mem = 0;
  int _btt = 0;

  String get version => _version;
  double get cpu => _cpu;
  double get disk => _dsk;
  double get memory => _mem;
  int get battery => _btt;

  void watchDevicePerformance() {
    if (_isWatchingDevicePerformance) {
      return;
    }
    _isWatchingDevicePerformance = true;
    _receivePort.listen((d) {
      if (d is Map<String, dynamic>) {
        _cpu = double.parse(d['c']!.toStringAsFixed(2));
        _dsk = double.parse(d['d']!.toStringAsFixed(2));
        _mem = double.parse(d['m']!.toStringAsFixed(2));
        _btt = d['b'];
        notifyListeners();
      }
    });
    var dmc = DmcClass(mainPort1: _receivePort.sendPort);
    dmc.spawn();
  }
}
