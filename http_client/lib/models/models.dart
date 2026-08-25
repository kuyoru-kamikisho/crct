enum RequestKind {
  http,
  websocket,
  sse,
  download,
  graphql,
}

enum RequestRunStatus { idle, running, success, failure }

class ParsedRequest {
  const ParsedRequest({
    required this.startLine,
    required this.endLine,
    required this.requestLine,
    required this.method,
    required this.url,
    required this.headers,
    required this.body,
    required this.kind,
    this.name,
    this.inputFile,
    this.outputFile,
    this.annotations = const {},
    this.queryContinuations = const [],
  });

  /// 0-based, inclusive. 区块起始（可能是 ### 行）。
  final int startLine;

  /// 0-based, inclusive.
  final int endLine;

  /// METHOD URL 所在行，0-based。播放按钮画在这一行。
  final int requestLine;

  final String? name;
  final String method;
  final String url;
  final Map<String, String> headers;
  final String body;
  final RequestKind kind;
  final String? inputFile;
  final String? outputFile;
  final Map<String, String> annotations;
  final List<String> queryContinuations;

  String get displayName {
    if (name != null && name!.trim().isNotEmpty) return name!.trim();
    return '$method $url';
  }

  String get composedUrl {
    if (queryContinuations.isEmpty) return url;
    final buf = StringBuffer(url);
    for (final q in queryContinuations) {
      buf.write(q.trim());
    }
    return buf.toString();
  }

  bool get insecure => annotations.containsKey('insecure');
  bool get noRedirect => annotations.containsKey('no-redirect');
  bool get forceStream => annotations.containsKey('stream');
  bool get forceDownload =>
      annotations.containsKey('download') || outputFile != null;

  Duration get timeout {
    final raw = annotations['timeout'];
    if (raw == null) return const Duration(seconds: 30);
    final ms = int.tryParse(raw);
    if (ms == null) return const Duration(seconds: 30);
    return Duration(milliseconds: ms);
  }

  ParsedRequest copyWith({
    String? method,
    String? url,
    Map<String, String>? headers,
    String? body,
    RequestKind? kind,
  }) {
    return ParsedRequest(
      startLine: startLine,
      endLine: endLine,
      requestLine: requestLine,
      name: name,
      method: method ?? this.method,
      url: url ?? this.url,
      headers: headers ?? this.headers,
      body: body ?? this.body,
      kind: kind ?? this.kind,
      inputFile: inputFile,
      outputFile: outputFile,
      annotations: annotations,
      queryContinuations: queryContinuations,
    );
  }
}

class ParsedDocument {
  const ParsedDocument({required this.requests, required this.lineCount});

  final List<ParsedRequest> requests;
  final int lineCount;

  ParsedRequest? atLine(int line) {
    for (final r in requests) {
      if (line >= r.startLine && line <= r.endLine) return r;
    }
    if (requests.isEmpty) return null;
    ParsedRequest? nearest;
    for (final r in requests) {
      if (r.startLine <= line) nearest = r;
    }
    return nearest ?? requests.first;
  }
}

class HistoryItem {
  HistoryItem({
    required this.id,
    required this.time,
    required this.method,
    required this.url,
    required this.name,
    this.statusCode,
    this.durationMs,
    this.error,
    this.requestSnippet = '',
    this.responseSnippet = '',
  });

  final String id;
  final DateTime time;
  final String method;
  final String url;
  final String name;
  final int? statusCode;
  final int? durationMs;
  final String? error;
  final String requestSnippet;
  final String responseSnippet;

  Map<String, dynamic> toJson() => {
        'id': id,
        'time': time.toIso8601String(),
        'method': method,
        'url': url,
        'name': name,
        'statusCode': statusCode,
        'durationMs': durationMs,
        'error': error,
        'requestSnippet': requestSnippet,
        'responseSnippet': responseSnippet,
      };

  factory HistoryItem.fromJson(Map<String, dynamic> json) {
    return HistoryItem(
      id: json['id'] as String? ?? '',
      time: DateTime.tryParse(json['time'] as String? ?? '') ?? DateTime.now(),
      method: json['method'] as String? ?? '',
      url: json['url'] as String? ?? '',
      name: json['name'] as String? ?? '',
      statusCode: json['statusCode'] as int?,
      durationMs: json['durationMs'] as int?,
      error: json['error'] as String?,
      requestSnippet: json['requestSnippet'] as String? ?? '',
      responseSnippet: json['responseSnippet'] as String? ?? '',
    );
  }
}

class ExecutionResult {
  ExecutionResult({
    required this.id,
    required this.requestLine,
    required this.method,
    required this.url,
    required this.kind,
    required this.startedAt,
    this.duration = Duration.zero,
    this.statusCode,
    this.statusText,
    this.headers = const {},
    this.bodyBytes = const [],
    this.bodyText = '',
    this.error,
    this.canceled = false,
    this.receivedBytes = 0,
    this.contentLength,
    this.downloadPath,
    this.streaming = false,
    this.done = false,
  });

  final String id;
  final int requestLine;
  String method;
  String url;
  final RequestKind kind;
  final DateTime startedAt;
  Duration duration;
  int? statusCode;
  String? statusText;
  Map<String, String> headers;
  List<int> bodyBytes;
  String bodyText;
  String? error;
  bool canceled;
  int receivedBytes;
  int? contentLength;
  String? downloadPath;
  bool streaming;
  bool done;

  bool get ok => error == null && !canceled && (statusCode == null || (statusCode! >= 200 && statusCode! < 400) || kind == RequestKind.websocket);
}

class WsMessage {
  WsMessage({required this.outgoing, required this.text, required this.time});

  final bool outgoing;
  final String text;
  final DateTime time;
}

class AppSettings {
  AppSettings({
    this.darkTheme = true,
    this.selectedEnv = '',
    this.lastFilePath = '',
    this.splitRatio = 0.62,
  });

  bool darkTheme;
  String selectedEnv;
  String lastFilePath;
  double splitRatio;

  Map<String, dynamic> toJson() => {
        'darkTheme': darkTheme,
        'selectedEnv': selectedEnv,
        'lastFilePath': lastFilePath,
        'splitRatio': splitRatio,
      };

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    return AppSettings(
      darkTheme: json['darkTheme'] as bool? ?? true,
      selectedEnv: json['selectedEnv'] as String? ?? '',
      lastFilePath: json['lastFilePath'] as String? ?? '',
      splitRatio: (json['splitRatio'] as num?)?.toDouble() ?? 0.62,
    );
  }
}
