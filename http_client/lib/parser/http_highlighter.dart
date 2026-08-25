import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import 'http_file_parser.dart';

class HighlightSpan {
  const HighlightSpan(this.start, this.end, this.color, {this.underline = false});
  final int start;
  final int end;
  final Color color;
  final bool underline;
}

class HttpHighlighter {
  static List<HighlightSpan> highlight(String text, HighlightScheme scheme) {
    if (text.isEmpty) return const [];
    final spans = <HighlightSpan>[];
    final newline = detectLineEnding(text);
    final lines = splitLines(text);
    var offset = 0;
    var inBody = false;
    var bodyLooksJson = false;

    for (var i = 0; i < lines.length; i++) {
      final line = lines[i];
      final lineStart = offset;
      final lineEnd = offset + line.length;
      final trimmed = line.trimLeft();

      if (isSeparatorLine(line)) {
        inBody = false;
        bodyLooksJson = false;
        spans.add(HighlightSpan(lineStart, lineEnd, scheme.separator));
      } else if (isCommentLine(line)) {
        final color = trimmed.contains('@') ? scheme.annotation : scheme.comment;
        spans.add(HighlightSpan(lineStart, lineEnd, color));
        _highlightVars(line, lineStart, spans, scheme.variable);
      } else if (HttpFileParser.isRequestLine(line)) {
        inBody = false;
        bodyLooksJson = false;
        final m = HttpFileParser.requestLinePattern.firstMatch(line.trim())!;
        final method = m.group(1)!;
        final url = m.group(2)!;
        final methodIdx = line.toUpperCase().indexOf(method.toUpperCase());
        final urlIdx = line.indexOf(url, methodIdx + method.length);
        spans.add(HighlightSpan(
          lineStart + methodIdx,
          lineStart + methodIdx + method.length,
          scheme.methodColor(method),
        ));
        if (urlIdx >= 0) {
          spans.add(HighlightSpan(
            lineStart + urlIdx,
            lineStart + urlIdx + url.length,
            scheme.url,
            underline: true,
          ));
        }
        _highlightVars(line, lineStart, spans, scheme.variable);
      } else if (!inBody && (trimmed.startsWith('?') || trimmed.startsWith('&'))) {
        spans.add(HighlightSpan(lineStart, lineEnd, scheme.url));
        _highlightVars(line, lineStart, spans, scheme.variable);
      } else if (!inBody && line.trim().isEmpty) {
        inBody = true;
        bodyLooksJson = false;
      } else if (!inBody && line.contains(':') && !trimmed.startsWith('{')) {
        final colon = line.indexOf(':');
        if (colon > 0) {
          spans.add(HighlightSpan(lineStart, lineStart + colon, scheme.headerKey));
          if (colon + 1 <= line.length) {
            spans.add(HighlightSpan(lineStart + colon, lineEnd, scheme.headerValue));
          }
          _highlightVars(line, lineStart, spans, scheme.variable);
        }
      } else {
        inBody = true;
        if (trimmed.startsWith('>>') || trimmed.startsWith('<')) {
          spans.add(HighlightSpan(lineStart, lineEnd, scheme.fileRef));
        } else if (looksLikeJson(trimmed) || bodyLooksJson) {
          if (looksLikeJson(trimmed)) bodyLooksJson = true;
          _highlightJsonLine(line, lineStart, spans, scheme);
        } else {
          spans.add(HighlightSpan(lineStart, lineEnd, scheme.body));
          _highlightVars(line, lineStart, spans, scheme.variable);
        }
      }

      offset = lineEnd;
      if (i < lines.length - 1) {
        offset += newline == '\r\n' &&
                offset + 1 < text.length &&
                text[offset] == '\r'
            ? 2
            : 1;
      }
    }

    spans.sort((a, b) {
      final c = a.start.compareTo(b.start);
      if (c != 0) return c;
      return b.end.compareTo(a.end);
    });
    return spans;
  }

  static void _highlightVars(
    String line,
    int lineStart,
    List<HighlightSpan> spans,
    Color color,
  ) {
    for (final m in RegExp(r'\{\{[^}]+\}\}').allMatches(line)) {
      spans.add(HighlightSpan(lineStart + m.start, lineStart + m.end, color));
    }
  }

  static void _highlightJsonLine(
    String line,
    int lineStart,
    List<HighlightSpan> spans,
    HighlightScheme scheme,
  ) {
    var i = 0;
    while (i < line.length) {
      if (line.startsWith('{{', i)) {
        final end = line.indexOf('}}', i);
        if (end > i) {
          spans.add(HighlightSpan(lineStart + i, lineStart + end + 2, scheme.variable));
          i = end + 2;
          continue;
        }
      }
      final ch = line[i];
      if (ch == '"' || ch == "'") {
        final start = i;
        i++;
        while (i < line.length && line[i] != ch) {
          if (line[i] == '\\' && i + 1 < line.length) i++;
          i++;
        }
        if (i < line.length) i++;
        var j = i;
        while (j < line.length && (line[j] == ' ' || line[j] == '\t')) {
          j++;
        }
        final isKey = j < line.length && line[j] == ':';
        spans.add(HighlightSpan(
          lineStart + start,
          lineStart + i,
          isKey ? scheme.jsonKey : scheme.jsonString,
        ));
        continue;
      }
      if (RegExp(r'[0-9]').hasMatch(ch) || (ch == '-' && i + 1 < line.length && RegExp(r'[0-9]').hasMatch(line[i + 1]))) {
        final start = i;
        i++;
        while (i < line.length && RegExp(r'[0-9.eE+\-]').hasMatch(line[i])) {
          i++;
        }
        spans.add(HighlightSpan(lineStart + start, lineStart + i, scheme.jsonNumber));
        continue;
      }
      if (line.startsWith('true', i) || line.startsWith('false', i) || line.startsWith('null', i)) {
        final word = line.startsWith('true', i)
            ? 'true'
            : line.startsWith('false', i)
                ? 'false'
                : 'null';
        final boundary = i + word.length == line.length ||
            !RegExp(r'[A-Za-z]').hasMatch(line[i + word.length]);
        if (boundary) {
          spans.add(HighlightSpan(
            lineStart + i,
            lineStart + i + word.length,
            scheme.jsonLiteral,
          ));
          i += word.length;
          continue;
        }
      }
      i++;
    }
  }
}
