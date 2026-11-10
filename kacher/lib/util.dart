String formatClock(int microseconds) {
  final total = microseconds <= 0 ? 0 : microseconds ~/ 1000000;
  final h = total ~/ 3600;
  final m = (total ~/ 60) % 60;
  final s = total % 60;
  String two(int n) => n.toString().padLeft(2, '0');
  if (h > 0) return '$h:${two(m)}:${two(s)}';
  return '${two(m)}:${two(s)}';
}

String formatStamp(DateTime time) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${time.year}${two(time.month)}${two(time.day)}-'
      '${two(time.hour)}${two(time.minute)}${two(time.second)}';
}

String formatDateTime(DateTime time) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${time.year}-${two(time.month)}-${two(time.day)} '
      '${two(time.hour)}:${two(time.minute)}:${two(time.second)}';
}

String formatGap(int microseconds) {
  if (microseconds < 300000) return '';
  final ms = microseconds / 1000;
  if (ms >= 1000) {
    return '间隔 ${(ms / 1000).toStringAsFixed(1)} 秒';
  }
  return '间隔 ${ms.round()} 毫秒';
}

String sanitizeFileName(String name) {
  var text = name.trim().replaceAll(RegExp(r'[<>:"/\\|?*\x00-\x1F]'), '_');
  text = text.replaceAll(RegExp(r'\s+'), ' ').trim();
  if (text.isEmpty || text == '.' || text == '..' || text == '_cache') {
    return '未命名';
  }
  if (text.length > 80) text = text.substring(0, 80).trim();
  return text;
}

String joinPath(String dir, String name) {
  if (dir.endsWith('\\') || dir.endsWith('/')) return '$dir$name';
  return '$dir\\$name';
}

bool samePath(String a, String b) => a.toLowerCase() == b.toLowerCase();

/// 只比较 x.y.z。带构建号或前缀时取其中的三段数字。
int compareVersion(String left, String right) {
  final a = _versionParts(left);
  final b = _versionParts(right);
  for (var i = 0; i < 3; i++) {
    final delta = a[i].compareTo(b[i]);
    if (delta != 0) return delta;
  }
  return 0;
}

String? parseRemoteVersion(String body) {
  return RegExp(r'(\d+\.\d+\.\d+)').firstMatch(body)?.group(1);
}

List<int> _versionParts(String raw) {
  final match = RegExp(r'(\d+)\.(\d+)\.(\d+)').firstMatch(raw.trim());
  if (match == null) return const [0, 0, 0];
  return [
    int.parse(match.group(1)!),
    int.parse(match.group(2)!),
    int.parse(match.group(3)!),
  ];
}
