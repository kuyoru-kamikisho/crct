import 'package:flutter/foundation.dart';

class UseWin with ChangeNotifier, DiagnosticableTreeMixin {
  double _x = 10;
  double _y = 10;
  double _w = 256;
  double _h = 400;

  double get width => _w;
  double get height => _h;
  double get x => _x;
  double get y => _y;

  void winSize(double? w, double? h) {
    _w = w ?? _w;
    _h = h ?? _h;
    notifyListeners();
  }

  void winPosition(double? x, double? y) {
    _x = x ?? _x;
    _y = y ?? _y;
    notifyListeners();
  }
}
