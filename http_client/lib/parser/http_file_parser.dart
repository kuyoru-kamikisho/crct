import '../models/models.dart';
import '../utils/helpers.dart';

class HttpFileParser {
  static const Set<String> methods = {
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
    'OPTIONS',
    'TRACE',
    'CONNECT',
    'WEBSOCKET',
    'WS',
    'WSS',
    'SSE',
    'GRAPHQL',
  };

  static final RegExp requestLinePattern = RegExp(
    r'^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT|WEBSOCKET|WS|WSS|SSE|GRAPHQL)\s+(\S+)(?:\s+HTTP/\d(?:\.\d)?)?\s*$',
    caseSensitive: false,
  );

  static bool isRequestLine(String line) => requestLinePattern.hasMatch(line.trim());

  static ParsedDocument parse(String text) {
    final lines = splitLines(text);
    final requests = <ParsedRequest>[];

    var i = 0;
    while (i < lines.length) {
      while (i < lines.length &&
          lines[i].trim().isEmpty &&
          !isSeparatorLine(lines[i])) {
        i++;
      }
      if (i >= lines.length) break;

      final blockStart = i;
      String? name;
      final annotations = <String, String>{};

      if (isSeparatorLine(lines[i])) {
        name = lines[i].trim().replaceFirst(RegExp(r'^###\s*'), '');
        if (name.isEmpty) name = null;
        i++;
      }

      while (i < lines.length && !isRequestLine(lines[i]) && !isSeparatorLine(lines[i])) {
        final t = lines[i].trimLeft();
        if (t.startsWith('# @') || t.startsWith('// @')) {
          _parseAnnotation(t.replaceFirst(RegExp(r'^(#|//)\s*'), ''), annotations);
        } else if (t.startsWith('@')) {
          _parseAnnotation(t.substring(1), annotations);
        }
        i++;
      }

      if (i >= lines.length || isSeparatorLine(lines[i])) {
        if (i == blockStart) i++;
        continue;
      }

      final reqLineIdx = i;
      final match = requestLinePattern.firstMatch(lines[i].trim())!;
      var method = match.group(1)!.toUpperCase();
      var url = match.group(2)!;
      i++;

      final queryParts = <String>[];
      while (i < lines.length) {
        final t = lines[i].trim();
        if (t.startsWith('?') || t.startsWith('&')) {
          queryParts.add(t);
          i++;
        } else {
          break;
        }
      }

      final headers = <String, String>{};
      String? inputFile;
      String? outputFile;
      while (i < lines.length &&
          lines[i].trim().isNotEmpty &&
          !isSeparatorLine(lines[i]) &&
          !isRequestLine(lines[i])) {
        final line = lines[i];
        final trimmed = line.trim();
        if (trimmed.startsWith('>>')) {
          outputFile = trimmed.replaceFirst(RegExp(r'^>>+\s*'), '').trim();
          i++;
          continue;
        }
        if (trimmed.startsWith('<')) {
          inputFile = trimmed.replaceFirst(RegExp(r'^<\s*'), '').trim();
          i++;
          continue;
        }
        if (isCommentLine(line)) {
          final t = line.trimLeft();
          if (t.contains('@')) {
            _parseAnnotation(t.replaceFirst(RegExp(r'^(#|//)\s*'), ''), annotations);
          }
          i++;
          continue;
        }
        final colon = line.indexOf(':');
        if (colon > 0) {
          final key = line.substring(0, colon).trim();
          final value = line.substring(colon + 1).trim();
          headers[key] = value;
        }
        i++;
      }

      if (i < lines.length && lines[i].trim().isEmpty) {
        i++;
      }

      final bodyLines = <String>[];
      while (i < lines.length && !isSeparatorLine(lines[i])) {
        if (isRequestLine(lines[i]) && bodyLines.isEmpty) break;
        if (isRequestLine(lines[i]) &&
            bodyLines.every((l) => l.trim().isEmpty || isCommentLine(l))) {
          break;
        }
        final trimmed = lines[i].trim();
        if (trimmed.startsWith('>>')) {
          outputFile = trimmed.replaceFirst(RegExp(r'^>>+\s*'), '').trim();
        } else if (trimmed.startsWith('< ') || trimmed == '<' || trimmed.startsWith('<')) {
          inputFile = trimmed.replaceFirst(RegExp(r'^<\s*'), '').trim();
          bodyLines.add(lines[i]);
        } else {
          bodyLines.add(lines[i]);
        }
        i++;
      }

      while (bodyLines.isNotEmpty && bodyLines.last.trim().isEmpty) {
        bodyLines.removeLast();
      }
      final body = bodyLines.join('\n');

      if (annotations['name'] != null && (name == null || name.isEmpty)) {
        name = annotations['name'];
      }

      final kind = detectKind(
        method: method,
        url: url,
        headers: headers,
        annotations: annotations,
        outputFile: outputFile,
      );

      if (method == 'WS' || method == 'WSS') method = 'WEBSOCKET';

      requests.add(
        ParsedRequest(
          startLine: blockStart,
          endLine: i > 0 ? i - 1 : blockStart,
          requestLine: reqLineIdx,
          name: name,
          method: method,
          url: url,
          headers: headers,
          body: body,
          kind: kind,
          inputFile: inputFile,
          outputFile: outputFile,
          annotations: annotations,
          queryContinuations: queryParts,
        ),
      );
    }

    return ParsedDocument(requests: requests, lineCount: lines.length);
  }

  static RequestKind detectKind({
    required String method,
    required String url,
    required Map<String, String> headers,
    required Map<String, String> annotations,
    String? outputFile,
  }) {
    final m = method.toUpperCase();
    final u = url.toLowerCase();
    if (m == 'WEBSOCKET' || m == 'WS' || m == 'WSS' || u.startsWith('ws://') || u.startsWith('wss://')) {
      return RequestKind.websocket;
    }
    if (m == 'GRAPHQL') return RequestKind.graphql;
    if (outputFile != null || annotations.containsKey('download')) {
      return RequestKind.download;
    }
    if (m == 'SSE' || annotations.containsKey('stream')) {
      return RequestKind.sse;
    }
    final accept = headers.entries
        .firstWhere(
          (e) => e.key.toLowerCase() == 'accept',
          orElse: () => const MapEntry('', ''),
        )
        .value
        .toLowerCase();
    if (accept.contains('text/event-stream')) return RequestKind.sse;
    return RequestKind.http;
  }

  static void _parseAnnotation(String raw, Map<String, String> out) {
    var s = raw.trim();
    if (s.startsWith('@')) s = s.substring(1);
    if (s.isEmpty) return;
    final sp = s.indexOf(RegExp(r'\s'));
    if (sp < 0) {
      out[s.toLowerCase()] = 'true';
    } else {
      out[s.substring(0, sp).toLowerCase()] = s.substring(sp + 1).trim();
    }
  }
}
