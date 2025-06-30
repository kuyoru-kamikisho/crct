import 'package:flutter/material.dart';

/// 全局存储
class MyAppState extends ChangeNotifier {
  double appScreenWidth = 320;
  double appScreenHeight = 720;

  void setScreenWidth(double n) {
    appScreenWidth = n;
    Future.microtask(() => notifyListeners());
  }

  void setScreenHeight(double n) {
    appScreenHeight = n;
    Future.microtask(() => notifyListeners());
  }
}