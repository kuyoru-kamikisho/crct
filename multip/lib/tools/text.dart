/// 超出 max 就保留前 max-1 个字符并加 '…'
String truncateWithEllipsis(String text, int max) {
  return text.length <= max ? text : '${text.substring(0, max - 1)}…';
}
