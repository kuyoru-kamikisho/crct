import 'package:flutter/material.dart';

/// 从CSS颜色字符串解析Color
/// 
/// 一个合法的 css 颜色 字符串 [colorString]
Color parseCssColor(String colorString) {
  // 处理 null 或空字符串
  if (colorString.isEmpty) return Colors.transparent;

  // 去除所有空格
  colorString = colorString.replaceAll(' ', '');

  try {
    // 处理 #RRGGBB 或 #RGB 格式
    if (colorString.startsWith('#')) {
      return _parseHexColor(colorString);
    }

    // 处理 rgb(r, g, b) 格式
    if (colorString.startsWith('rgb(')) {
      return _parseRgbColor(colorString);
    }

    // 处理 rgba(r, g, b, a) 格式
    if (colorString.startsWith('rgba(')) {
      return _parseRgbaColor(colorString);
    }

    // 尝试解析命名颜色（如 'red', 'blue' 等）
    final color = _parseNamedColor(colorString);
    if (color != null) return color;
  } catch (e) {
    // 解析出错时捕获异常
    debugPrint('颜色解析错误: $e');
  }

  // 默认返回透明色
  return Colors.transparent;
}

Color _parseHexColor(String hexColor) {
  hexColor = hexColor.replaceFirst('#', '');
  if (hexColor.length == 6) {
    hexColor = 'FF$hexColor'; // 添加不透明度
  } else if (hexColor.length == 3) {
    // 处理 #RGB 简写格式
    hexColor = 'FF${hexColor[0]}${hexColor[0]}${hexColor[1]}${hexColor[1]}${hexColor[2]}${hexColor[2]}';
  } else if (hexColor.length == 8) {
    // 已经是 #AARRGGBB 格式
  } else {
    throw FormatException('非法的HEX颜色格式');
  }

  final colorValue = int.tryParse(hexColor, radix: 16);
  if (colorValue == null) throw FormatException('非法的HEX颜色值');

  return Color(colorValue);
}

Color _parseRgbColor(String rgbColor) {
  final parts = rgbColor.substring(4, rgbColor.length - 1).split(',');
  if (parts.length != 3) throw FormatException('非法的RGB格式');

  final r = _parseColorPart(parts[0]);
  final g = _parseColorPart(parts[1]);
  final b = _parseColorPart(parts[2]);

  return Color.fromRGBO(r, g, b, 1.0);
}

Color _parseRgbaColor(String rgbaColor) {
  final parts = rgbaColor.substring(5, rgbaColor.length - 1).split(',');
  if (parts.length != 4) throw FormatException('非法的RGBA格式');

  final r = _parseColorPart(parts[0]);
  final g = _parseColorPart(parts[1]);
  final b = _parseColorPart(parts[2]);
  final a = _parseAlphaPart(parts[3]);

  return Color.fromRGBO(r, g, b, a);
}

int _parseColorPart(String part) {
  final value = int.tryParse(part);
  if (value == null || value < 0 || value > 255) {
    throw FormatException('颜色分量必须在0-255之间');
  }
  return value;
}

double _parseAlphaPart(String part) {
  final value = double.tryParse(part);
  if (value == null || value < 0 || value > 1) {
    throw FormatException('透明度必须在0.0-1.0之间');
  }
  return value;
}

Color? _parseNamedColor(String colorName) {
  // Flutter预定义的颜色
  const colorMap = {
    'transparent': Colors.transparent,
    'black': Colors.black,
    'white': Colors.white,
    'red': Colors.red,
    'green': Colors.green,
    'blue': Colors.blue,
    // 可以添加更多命名颜色...
  };

  return colorMap[colorName.toLowerCase()];
}