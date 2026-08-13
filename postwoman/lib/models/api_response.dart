import 'dart:typed_data';

class WsLine {
  final DateTime time;
  final bool outgoing;
  final String text;
  final bool binary;

  WsLine({
    required this.time,
    required this.outgoing,
    required this.text,
    this.binary = false,
  });
}

class ResponseState {
  int? statusCode;
  String reasonPhrase = '';
  Map<String, String> headers = {};
  String bodyText = '';
  Uint8List bodyBytes = Uint8List(0);
  int byteCount = 0;
  bool streaming = false;
  bool done = false;
  String? error;
  Duration elapsed = Duration.zero;
  bool wsConnected = false;
  List<WsLine> wsLines = [];

  String get contentType {
    for (final e in headers.entries) {
      if (e.key.toLowerCase() == 'content-type') return e.value;
    }
    return '';
  }

  bool get isSse => contentType.toLowerCase().contains('text/event-stream');

  bool get isJson {
    final ct = contentType.toLowerCase();
    return ct.contains('json') || ct.contains('+json');
  }

  bool get isImage {
    final ct = contentType.toLowerCase();
    return ct.startsWith('image/');
  }

  String get statusLabel {
    if (error != null && statusCode == null) return '错误';
    if (statusCode == null) return streaming ? '进行中' : '-';
    final reason = reasonPhrase.trim();
    return reason.isEmpty ? '$statusCode' : '$statusCode $reason';
  }

  ResponseState copy() {
    return ResponseState()
      ..statusCode = statusCode
      ..reasonPhrase = reasonPhrase
      ..headers = Map.of(headers)
      ..bodyText = bodyText
      ..bodyBytes = Uint8List.fromList(bodyBytes)
      ..byteCount = byteCount
      ..streaming = streaming
      ..done = done
      ..error = error
      ..elapsed = elapsed
      ..wsConnected = wsConnected
      ..wsLines = List.of(wsLines);
  }
}

class ResponsePatch {
  final int? statusCode;
  final String? reasonPhrase;
  final Map<String, String>? headers;
  final String? bodyText;
  final Uint8List? bodyBytes;
  final int? byteCount;
  final bool? streaming;
  final bool? done;
  final String? error;
  final Duration? elapsed;
  final bool? wsConnected;
  final WsLine? wsLine;
  final bool clearWs;

  const ResponsePatch({
    this.statusCode,
    this.reasonPhrase,
    this.headers,
    this.bodyText,
    this.bodyBytes,
    this.byteCount,
    this.streaming,
    this.done,
    this.error,
    this.elapsed,
    this.wsConnected,
    this.wsLine,
    this.clearWs = false,
  });

  void apply(ResponseState s) {
    if (statusCode != null) s.statusCode = statusCode;
    if (reasonPhrase != null) s.reasonPhrase = reasonPhrase!;
    if (headers != null) s.headers = headers!;
    if (bodyText != null) s.bodyText = bodyText!;
    if (bodyBytes != null) s.bodyBytes = bodyBytes!;
    if (byteCount != null) s.byteCount = byteCount!;
    if (streaming != null) s.streaming = streaming!;
    if (done != null) s.done = done!;
    if (error != null) s.error = error;
    if (elapsed != null) s.elapsed = elapsed!;
    if (wsConnected != null) s.wsConnected = wsConnected!;
    if (clearWs) s.wsLines = [];
    if (wsLine != null) s.wsLines.add(wsLine!);
  }
}
