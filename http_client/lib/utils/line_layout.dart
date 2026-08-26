import 'package:flutter/painting.dart';

import 'helpers.dart';

const kEditorFontFamily = 'Consolas';
const kEditorFontSize = 13.5;
const kEditorLineHeight = 20.0;
const kEditorContentPadding = EdgeInsets.fromLTRB(12, 0, 12, 12);

/// 按逻辑行（`\n` 分隔）测量软换行后的视觉高度。
///
/// 行号 gutter 必须用这些高度，而不能假定每行都是 [minLineHeight]：
/// 超长 Cookie/Token 没有换行符，但会在编辑器宽度内折行。
List<double> measureLogicalLineHeights({
  required String text,
  required double maxWidth,
  required TextStyle style,
  required StrutStyle strutStyle,
  TextScaler textScaler = TextScaler.noScaling,
  double minLineHeight = kEditorLineHeight,
}) {
  final lines = splitLines(text);
  if (maxWidth <= 1) {
    return List<double>.filled(lines.length, minLineHeight);
  }

  final painter = TextPainter(
    textDirection: TextDirection.ltr,
    strutStyle: strutStyle,
    textScaler: textScaler,
    textWidthBasis: TextWidthBasis.parent,
  );

  final heights = <double>[];
  for (final line in lines) {
    painter.text = TextSpan(
      text: line.isEmpty ? ' ' : line,
      style: style,
    );
    painter.layout(maxWidth: maxWidth);
    final h = painter.height;
    heights.add(h < minLineHeight ? minLineHeight : h);
  }
  painter.dispose();
  return heights;
}

/// 每个逻辑行在原文中的 [start, end) 字符区间（不含换行符）。
List<({int start, int end})> logicalLineRanges(String text) {
  final lines = splitLines(text);
  final ranges = <({int start, int end})>[];
  var offset = 0;
  for (var i = 0; i < lines.length; i++) {
    final start = offset;
    final end = offset + lines[i].length;
    ranges.add((start: start, end: end));
    offset = end;
    if (i >= lines.length - 1) continue;
    if (offset < text.length && text[offset] == '\r') {
      offset++;
      if (offset < text.length && text[offset] == '\n') offset++;
    } else if (offset < text.length && text[offset] == '\n') {
      offset++;
    }
  }
  return ranges;
}
