import 'package:flutter/material.dart';

/// 小提示信息的通用样式
TextStyle dmcTextStyle(
    {double size = 12,
    Color color = Colors.white,
    TextDecoration txtdc = TextDecoration.none,
    FontWeight weight = FontWeight.w400}) {
  return TextStyle(
      fontSize: size, decoration: txtdc, color: color, fontWeight: weight);
}

Color? statuColor(double v) {
  return v < 25
      ? Colors.blue[400]
      : v < 50
          ? Colors.greenAccent
          : v < 75
              ? Colors.amber[400]
              : Colors.pinkAccent;
}
