import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import '../models/api_request.dart';
import '../models/api_response.dart';
import '../models/kv_pair.dart';

typedef PatchFn = void Function(ResponsePatch patch);

class RequestSession {
  HttpClient? httpClient;
  WebSocket? socket;
  bool cancelled = false;
  int gen = 0;

  void cancel() {
    cancelled = true;
    gen++;
    try {
      httpClient?.close(force: true);
    } catch (_) {}
    try {
      socket?.close();
    } catch (_) {}
    httpClient = null;
    socket = null;
  }
}

Future<void> sendRequest({
  required ApiRequest request,
  required RequestSession session,
  required PatchFn onPatch,
}) async {
  if (request.isWebSocket) {
    await _sendWebSocket(request: request, session: session, onPatch: onPatch);
  } else {
    await _sendHttp(request: request, session: session, onPatch: onPatch);
  }
}

Future<void> sendWsMessage(RequestSession session, String text) async {
  final ws = session.socket;
  if (ws == null) {
    throw StateError('WebSocket 未连接');
  }
  ws.add(text);
}

Future<void> _sendHttp({
  required ApiRequest request,
  required RequestSession session,
  required PatchFn onPatch,
}) async {
  final started = DateTime.now();
  final client = HttpClient();
  session.httpClient = client;
  client.autoUncompress = true;
  client.connectionTimeout = Duration(seconds: max(1, request.timeoutSeconds));
  client.idleTimeout = Duration(seconds: max(1, request.timeoutSeconds));
  if (request.insecureSsl) {
    client.badCertificateCallback = (cert, host, port) => true;
  }

  try {
    final uri = request.resolveUri();
    final method = request.method.toUpperCase();
    final req = await client.openUrl(method, uri);
    if (session.cancelled) return;

    req.followRedirects = request.followRedirects;
    req.maxRedirects = request.followRedirects ? 8 : 0;

    _applyHeaders(req, request);

    if (request.bodyType == BodyType.multipart) {
      await _writeMultipart(req, request.enabledFormFields);
    } else {
      final bytes = _encodeBody(request);
      if (bytes.isNotEmpty) {
        if (!request.hasHeader('Content-Type')) {
          final ct = switch (request.bodyType) {
            BodyType.json => 'application/json',
            BodyType.form => 'application/x-www-form-urlencoded',
            BodyType.text => 'text/plain; charset=utf-8',
            _ => null,
          };
          if (ct != null) {
            req.headers.set(HttpHeaders.contentTypeHeader, ct);
          }
        }
        req.add(bytes);
      }
    }

    final res = await req.close();
    if (session.cancelled) return;

    final headers = <String, String>{};
    res.headers.forEach((name, values) {
      headers[name] = values.join(', ');
    });

    onPatch(ResponsePatch(
      statusCode: res.statusCode,
      reasonPhrase: res.reasonPhrase,
      headers: headers,
      streaming: true,
      done: false,
      elapsed: DateTime.now().difference(started),
    ));

    final builder = BytesBuilder(copy: false);
    final decoder = Utf8Decoder(allowMalformed: true);
    final text = StringBuffer();
    var lastEmit = DateTime.now();

    await for (final chunk in res) {
      if (session.cancelled) return;
      builder.add(chunk);
      text.write(decoder.convert(chunk));
      final now = DateTime.now();
      if (now.difference(lastEmit).inMilliseconds >= 40) {
        lastEmit = now;
        onPatch(ResponsePatch(
          bodyText: text.toString(),
          byteCount: builder.length,
          elapsed: now.difference(started),
          streaming: true,
        ));
      }
    }

    if (session.cancelled) return;
    final bytes = builder.takeBytes();
    onPatch(ResponsePatch(
      bodyText: text.toString(),
      bodyBytes: Uint8List.fromList(bytes),
      byteCount: bytes.length,
      streaming: false,
      done: true,
      elapsed: DateTime.now().difference(started),
    ));
  } on Object catch (e) {
    if (session.cancelled) return;
    onPatch(ResponsePatch(
      error: _errorText(e),
      streaming: false,
      done: true,
      elapsed: DateTime.now().difference(started),
    ));
  } finally {
    try {
      client.close(force: true);
    } catch (_) {}
    if (session.httpClient == client) {
      session.httpClient = null;
    }
  }
}

Future<void> _sendWebSocket({
  required ApiRequest request,
  required RequestSession session,
  required PatchFn onPatch,
}) async {
  final started = DateTime.now();
  final client = HttpClient();
  session.httpClient = client;
  client.connectionTimeout = Duration(seconds: max(1, request.timeoutSeconds));
  if (request.insecureSsl) {
    client.badCertificateCallback = (cert, host, port) => true;
  }

  try {
    final uri = request.resolveUri();
    final headerMap = <String, dynamic>{};
    for (final h in request.enabledHeaders) {
      headerMap[h.key.trim()] = h.value;
    }
    final ws = await WebSocket.connect(
      uri.toString(),
      headers: headerMap.isEmpty ? null : headerMap,
      customClient: client,
    );
    if (session.cancelled) {
      await ws.close();
      return;
    }
    session.socket = ws;
    onPatch(ResponsePatch(
      statusCode: 101,
      reasonPhrase: 'Switching Protocols',
      streaming: true,
      done: false,
      wsConnected: true,
      clearWs: true,
      elapsed: DateTime.now().difference(started),
    ));

    await for (final message in ws) {
      if (session.cancelled) return;
      if (message is String) {
        onPatch(ResponsePatch(
          wsLine: WsLine(time: DateTime.now(), outgoing: false, text: message),
          elapsed: DateTime.now().difference(started),
        ));
      } else if (message is List<int>) {
        onPatch(ResponsePatch(
          wsLine: WsLine(
            time: DateTime.now(),
            outgoing: false,
            text: _hexPreview(message),
            binary: true,
          ),
          elapsed: DateTime.now().difference(started),
        ));
      }
    }
    if (session.cancelled) return;
    onPatch(ResponsePatch(
      wsConnected: false,
      streaming: false,
      done: true,
      elapsed: DateTime.now().difference(started),
    ));
  } on Object catch (e) {
    if (session.cancelled) return;
    onPatch(ResponsePatch(
      error: _errorText(e),
      wsConnected: false,
      streaming: false,
      done: true,
      elapsed: DateTime.now().difference(started),
    ));
  } finally {
    try {
      session.socket?.close();
    } catch (_) {}
    session.socket = null;
    try {
      client.close(force: true);
    } catch (_) {}
    if (session.httpClient == client) {
      session.httpClient = null;
    }
  }
}

void _applyHeaders(HttpClientRequest req, ApiRequest request) {
  for (final h in request.enabledHeaders) {
    final key = h.key.trim();
    if (key.isEmpty) continue;
    final lower = key.toLowerCase();
    if (lower == 'content-length' || lower == 'host' || lower == 'transfer-encoding') {
      continue;
    }
    req.headers.set(key, h.value);
  }
}

List<int> _encodeBody(ApiRequest request) {
  switch (request.bodyType) {
    case BodyType.none:
      return const [];
    case BodyType.json:
    case BodyType.text:
      return utf8.encode(request.body);
    case BodyType.form:
      if (request.enabledFormFields.isNotEmpty) {
        return utf8.encode(request.enabledFormFields
            .map((e) =>
                '${Uri.encodeQueryComponent(e.key.trim())}=${Uri.encodeQueryComponent(e.value)}')
            .join('&'));
      }
      return utf8.encode(request.body);
    case BodyType.multipart:
      return const [];
  }
}

Future<void> _writeMultipart(HttpClientRequest req, List<KvPair> fields) async {
  final boundary = '----Postwoman${DateTime.now().millisecondsSinceEpoch}${Random().nextInt(1 << 20)}';
  req.headers.set(HttpHeaders.contentTypeHeader, 'multipart/form-data; boundary=$boundary');
  final builder = BytesBuilder();
  for (final f in fields) {
    builder.add(utf8.encode('--$boundary\r\n'));
    final value = f.value;
    if (value.startsWith('@')) {
      final path = value.substring(1);
      final file = File(path);
      if (file.existsSync()) {
        final name = path.replaceAll('\\', '/').split('/').last;
        builder.add(utf8.encode(
          'Content-Disposition: form-data; name="${f.key.trim()}"; filename="$name"\r\n'
          'Content-Type: application/octet-stream\r\n\r\n',
        ));
        builder.add(file.readAsBytesSync());
        builder.add(utf8.encode('\r\n'));
        continue;
      }
    }
    builder.add(utf8.encode(
      'Content-Disposition: form-data; name="${f.key.trim()}"\r\n\r\n${f.value}\r\n',
    ));
  }
  builder.add(utf8.encode('--$boundary--\r\n'));
  req.add(builder.takeBytes());
}

String _errorText(Object e) {
  if (e is SocketException) {
    return e.message.isNotEmpty ? '网络错误：${e.message}' : '网络错误：$e';
  }
  if (e is HandshakeException) {
    return 'TLS 握手失败：$e';
  }
  if (e is TimeoutException) {
    return '请求超时';
  }
  if (e is FormatException) {
    return e.message;
  }
  return e.toString();
}

String _hexPreview(List<int> bytes) {
  final take = bytes.length > 256 ? 256 : bytes.length;
  final hex = bytes
      .take(take)
      .map((b) => b.toRadixString(16).padLeft(2, '0'))
      .join(' ');
  if (bytes.length > take) {
    return '$hex … (${bytes.length} bytes)';
  }
  return '$hex (${bytes.length} bytes)';
}
