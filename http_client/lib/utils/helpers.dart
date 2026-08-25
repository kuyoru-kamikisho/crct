import 'dart:convert';
import 'dart:math';

final _rand = Random.secure();

String randomUuid() {
  final bytes = List<int>.generate(16, (_) => _rand.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  String hex(int b) => b.toRadixString(16).padLeft(2, '0');
  final h = bytes.map(hex).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

String detectLineEnding(String text) {
  var crlf = 0;
  var lf = 0;
  for (var i = 0; i < text.length; i++) {
    if (text[i] == '\n') {
      if (i > 0 && text[i - 1] == '\r') {
        crlf++;
      } else {
        lf++;
      }
    }
  }
  return crlf >= lf && crlf > 0 ? '\r\n' : '\n';
}

List<String> splitLines(String text) {
  if (text.isEmpty) return [''];
  return text.split(RegExp(r'\r\n|\n|\r'));
}

String formatBytes(int n) {
  if (n < 1024) return '$n B';
  if (n < 1024 * 1024) return '${(n / 1024).toStringAsFixed(1)} KB';
  if (n < 1024 * 1024 * 1024) {
    return '${(n / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
  return '${(n / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
}

String formatDuration(Duration d) {
  if (d.inMilliseconds < 1000) return '${d.inMilliseconds} ms';
  return '${(d.inMilliseconds / 1000).toStringAsFixed(2)} s';
}

String prettyJson(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return raw;
  try {
    final decoded = jsonDecode(trimmed);
    return const JsonEncoder.withIndent('  ').convert(decoded);
  } catch (_) {
    return raw;
  }
}

bool looksLikeJson(String raw) {
  final t = raw.trimLeft();
  return t.startsWith('{') || t.startsWith('[');
}

/// 去掉命令提示符、curl 前的无关前缀。
String stripShellPrompt(String raw) {
  var s = raw.trim();
  s = s.replaceFirst(RegExp(r'^\$\s*'), '');
  s = s.replaceFirst(RegExp(r'^PS[^>]*>\s*'), '');
  s = s.replaceFirst(RegExp(r'^[A-Za-z]:\\[^>]*>\s*'), '');
  return s.trim();
}

bool isCommentLine(String line) {
  final t = line.trimLeft();
  return t.startsWith('#') || t.startsWith('//');
}

bool isSeparatorLine(String line) => line.trimLeft().startsWith('###');
