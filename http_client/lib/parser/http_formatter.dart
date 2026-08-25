import 'dart:convert';

import '../utils/helpers.dart';
import 'http_file_parser.dart';

class HttpFormatter {
  /// 格式化 .http 文档：规范分隔符、请求行、请求头空格，并对 JSON 请求体美化。
  static String format(String text) {
    if (text.trim().isEmpty) return text;
    final ending = detectLineEnding(text);
    final parsed = HttpFileParser.parse(text);
    if (parsed.requests.isEmpty) {
      return _formatLoose(text, ending);
    }

    final chunks = <String>[];

    for (final req in parsed.requests) {
      final buf = StringBuffer();
      final name = req.name?.trim();
      buf.writeln('### ${name ?? ''}'.trimRight());

      for (final e in req.annotations.entries) {
        if (e.key == 'name' && name == e.value) continue;
        if (e.value == 'true') {
          buf.writeln('# @${e.key}');
        } else {
          buf.writeln('# @${e.key} ${e.value}');
        }
      }

      buf.writeln('${req.method} ${req.composedUrl}');
      req.headers.forEach((k, v) {
        buf.writeln('$k: $v');
      });

      var body = req.body;
      if (req.inputFile != null && body.trim().startsWith('<')) {
        body = '< ${req.inputFile}';
      } else if (looksLikeJson(body)) {
        body = prettyJson(body);
      } else if (_looksLikeGraphql(req.method, body)) {
        body = body.trim();
      } else {
        body = body.trimRight();
      }

      if (body.trim().isNotEmpty) {
        buf.writeln();
        buf.write(body.trimRight());
        buf.writeln();
      }
      if (req.outputFile != null) {
        buf.writeln('>> ${req.outputFile}');
      }
      chunks.add(buf.toString().trimRight());
    }

    var result = chunks.join('$ending$ending');
    result = result.split('\n').map((l) => l.replaceAll('\r', '')).join(ending);
    if (!result.endsWith(ending)) result += ending;
    return result;
  }

  static String _formatLoose(String text, String ending) {
    return splitLines(text).join(ending);
  }

  static bool _looksLikeGraphql(String method, String body) {
    if (method.toUpperCase() != 'GRAPHQL') return false;
    final t = body.trimLeft();
    return t.startsWith('query') || t.startsWith('mutation') || t.startsWith('subscription');
  }

  /// 仅美化当前请求体中的 JSON（供局部格式化使用）。
  static String formatJsonSnippet(String raw) {
    try {
      final decoded = jsonDecode(raw);
      return const JsonEncoder.withIndent('  ').convert(decoded);
    } catch (_) {
      return raw;
    }
  }
}
