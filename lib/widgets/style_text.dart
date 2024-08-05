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

IconData statuBattery(int v) {
  return v >= 95
      ? Icons.battery_full
      : v >= 75
          ? Icons.battery_6_bar
          : v >= 55
              ? Icons.battery_5_bar
              : v >= 45
                  ? Icons.battery_4_bar
                  : v >= 35
                      ? Icons.battery_3_bar
                      : v >= 25
                          ? Icons.battery_2_bar
                          : v >= 15
                              ? Icons.battery_1_bar
                              : Icons.battery_0_bar;
}
