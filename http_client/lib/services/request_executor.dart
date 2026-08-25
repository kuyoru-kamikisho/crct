import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../models/models.dart';
import '../parser/variable_interpolator.dart';
import '../utils/helpers.dart';
import 'app_paths.dart';

typedef ProgressCallback = void Function(ExecutionResult result);
typedef WsMessageCallback = void Function(String sessionId, WsMessage message);

class RequestExecutor {
  RequestExecutor();

  final Map<String, StreamSubscription> _subs = {};
  final Map<String, WebSocketChannel> _ws = {};
  final Map<String, http.Client> _clients = {};
  final Map<String, IOSink> _downloadSinks = {};

  Future<ExecutionResult> execute(
    ParsedRequest request, {
    required Map<String, String> env,
    required ProgressCallback onUpdate,
    WsMessageCallback? onWsMessage,
    String? workingDirectory,
  }) async {
    final id = randomUuid();
    final resolved = _resolve(request, env);
    final started = DateTime.now();
    final result = ExecutionResult(
      id: id,
      requestLine: request.requestLine,
      method: resolved.method,
      url: resolved.composedUrl,
      kind: resolved.kind,
      startedAt: started,
      streaming: resolved.kind == RequestKind.sse ||
          resolved.kind == RequestKind.websocket ||
          resolved.kind == RequestKind.download,
    );
    onUpdate(result);

    try {
      switch (resolved.kind) {
        case RequestKind.websocket:
          await _runWebSocket(result, resolved, onUpdate, onWsMessage);
          break;
        case RequestKind.sse:
          await _runSse(result, resolved, onUpdate);
          break;
        case RequestKind.download:
          await _runDownload(result, resolved, onUpdate, workingDirectory);
          break;
        case RequestKind.graphql:
          await _runGraphql(result, resolved, onUpdate, workingDirectory);
          break;
        case RequestKind.http:
          await _runHttp(result, resolved, onUpdate, workingDirectory);
          break;
      }
    } catch (e, st) {
      result.error = '$e';
      result.done = true;
      result.duration = DateTime.now().difference(started);
      onUpdate(result);
      // ignore: avoid_print
      print(st);
    }
    return result;
  }

  ParsedRequest _resolve(ParsedRequest r, Map<String, String> env) {
    String map(String s) => VariableInterpolator.interpolate(s, env);
    final headers = <String, String>{};
    r.headers.forEach((k, v) => headers[map(k)] = map(v));
    return r.copyWith(
      method: map(r.method),
      url: map(r.composedUrl),
      headers: headers,
      body: map(r.body),
    );
  }

  Future<void> _runHttp(
    ExecutionResult result,
    ParsedRequest req,
    ProgressCallback onUpdate,
    String? workingDirectory,
  ) async {
    final client = http.Client();
    _clients[result.id] = client;
    try {
      final uri = Uri.parse(req.composedUrl);
      final bodyBytes = await _buildBody(req, workingDirectory);
      final httpReq = http.Request(req.method, uri);
      httpReq.headers.addAll(req.headers);
      if (bodyBytes != null) httpReq.bodyBytes = bodyBytes;

      final streamed = await client.send(httpReq).timeout(req.timeout);
      result.statusCode = streamed.statusCode;
      result.statusText = streamed.reasonPhrase;
      result.headers = streamed.headers.map((k, v) => MapEntry(k, v));
      result.contentLength = streamed.contentLength;
      onUpdate(result);

      final chunks = <List<int>>[];
      await for (final chunk in streamed.stream) {
        chunks.add(chunk);
        result.receivedBytes += chunk.length;
        onUpdate(result);
      }
      result.bodyBytes = chunks.expand((e) => e).toList();
      result.bodyText = _decodeBody(result.bodyBytes, result.headers);
      result.done = true;
      result.duration = DateTime.now().difference(result.startedAt);
      onUpdate(result);
    } finally {
      client.close();
      _clients.remove(result.id);
    }
  }

  Future<void> _runGraphql(
    ExecutionResult result,
    ParsedRequest req,
    ProgressCallback onUpdate,
    String? workingDirectory,
  ) async {
    var body = req.body.trim();
    Map<String, dynamic> payload;
    if (looksLikeJson(body)) {
      payload = jsonDecode(body) as Map<String, dynamic>;
    } else {
      payload = {'query': body};
    }
    final headers = Map<String, String>.from(req.headers);
    headers.putIfAbsent('Content-Type', () => 'application/json');
    final patched = req.copyWith(
      method: 'POST',
      headers: headers,
      body: jsonEncode(payload),
      kind: RequestKind.http,
    );
    await _runHttp(result, patched, onUpdate, workingDirectory);
  }

  Future<void> _runSse(
    ExecutionResult result,
    ParsedRequest req,
    ProgressCallback onUpdate,
  ) async {
    final client = http.Client();
    _clients[result.id] = client;
    try {
      final uri = Uri.parse(req.composedUrl);
      final httpReq = http.Request(req.method == 'SSE' ? 'GET' : req.method, uri);
      final headers = Map<String, String>.from(req.headers);
      headers.putIfAbsent('Accept', () => 'text/event-stream');
      headers.putIfAbsent('Cache-Control', () => 'no-cache');
      httpReq.headers.addAll(headers);
      if (req.body.trim().isNotEmpty) {
        httpReq.body = req.body;
      }

      final streamed = await client.send(httpReq).timeout(req.timeout);
      result.statusCode = streamed.statusCode;
      result.statusText = streamed.reasonPhrase;
      result.headers = streamed.headers.map((k, v) => MapEntry(k, v));
      result.streaming = true;
      onUpdate(result);

      final buf = StringBuffer();
      final sub = streamed.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter())
          .listen((line) {
        buf.writeln(line);
        result.bodyText = buf.toString();
        result.receivedBytes = utf8.encode(result.bodyText).length;
        result.duration = DateTime.now().difference(result.startedAt);
        onUpdate(result);
      }, onError: (e) {
        result.error = '$e';
        result.done = true;
        onUpdate(result);
      }, onDone: () {
        result.done = true;
        result.duration = DateTime.now().difference(result.startedAt);
        onUpdate(result);
      });
      _subs[result.id] = sub;
      await sub.asFuture<void>();
    } finally {
      client.close();
      _clients.remove(result.id);
      _subs.remove(result.id);
    }
  }

  Future<void> _runDownload(
    ExecutionResult result,
    ParsedRequest req,
    ProgressCallback onUpdate,
    String? workingDirectory,
  ) async {
    final client = http.Client();
    _clients[result.id] = client;
    try {
      final uri = Uri.parse(req.composedUrl);
      final httpReq = http.Request(req.method, uri);
      httpReq.headers.addAll(req.headers);
      final bodyBytes = await _buildBody(req, workingDirectory);
      if (bodyBytes != null) httpReq.bodyBytes = bodyBytes;

      final streamed = await client.send(httpReq).timeout(req.timeout);
      result.statusCode = streamed.statusCode;
      result.statusText = streamed.reasonPhrase;
      result.headers = streamed.headers.map((k, v) => MapEntry(k, v));
      result.contentLength = streamed.contentLength;
      result.streaming = true;

      final fileName = _resolveDownloadName(req, uri, streamed.headers);
      final filePath = p.isAbsolute(fileName)
          ? fileName
          : p.join(AppPaths.downloadsDir, fileName);
      await Directory(p.dirname(filePath)).create(recursive: true);
      final sink = File(filePath).openWrite();
      _downloadSinks[result.id] = sink;
      result.downloadPath = filePath;
      onUpdate(result);

      await for (final chunk in streamed.stream) {
        sink.add(chunk);
        result.receivedBytes += chunk.length;
        result.duration = DateTime.now().difference(result.startedAt);
        onUpdate(result);
      }
      await sink.flush();
      await sink.close();
      _downloadSinks.remove(result.id);
      result.bodyText =
          '已保存到: $filePath\n大小: ${formatBytes(result.receivedBytes)}';
      result.done = true;
      result.duration = DateTime.now().difference(result.startedAt);
      onUpdate(result);
    } finally {
      client.close();
      _clients.remove(result.id);
    }
  }

  Future<void> _runWebSocket(
    ExecutionResult result,
    ParsedRequest req,
    ProgressCallback onUpdate,
    WsMessageCallback? onWsMessage,
  ) async {
    var url = req.composedUrl;
    if (url.startsWith('http://')) url = 'ws://${url.substring(7)}';
    if (url.startsWith('https://')) url = 'wss://${url.substring(8)}';
    result.url = url;

    final channel = IOWebSocketChannel.connect(
      Uri.parse(url),
      headers: req.headers.isEmpty ? null : req.headers,
    );
    _ws[result.id] = channel;
    result.statusText = 'connecting';
    result.streaming = true;
    onUpdate(result);

    try {
      await channel.ready.timeout(req.timeout);
      result.statusCode = 101;
      result.statusText = 'connected';
      result.bodyText = 'WebSocket 已连接: $url\n';
      onUpdate(result);

      final body = req.body.trim();
      if (body.isNotEmpty) {
        channel.sink.add(body);
        onWsMessage?.call(
          result.id,
          WsMessage(outgoing: true, text: body, time: DateTime.now()),
        );
        result.bodyText += '>> $body\n';
        onUpdate(result);
      }

      final sub = channel.stream.listen((event) {
        final text = event is String ? event : utf8.decode(event as List<int>);
        result.bodyText += '<< $text\n';
        result.receivedBytes += utf8.encode(text).length;
        result.duration = DateTime.now().difference(result.startedAt);
        onUpdate(result);
        onWsMessage?.call(
          result.id,
          WsMessage(outgoing: false, text: text, time: DateTime.now()),
        );
      }, onError: (e) {
        result.error = '$e';
        result.done = true;
        onUpdate(result);
      }, onDone: () {
        result.statusText = 'closed';
        result.done = true;
        result.duration = DateTime.now().difference(result.startedAt);
        onUpdate(result);
      });
      _subs[result.id] = sub;
    } catch (e) {
      result.error = '$e';
      result.done = true;
      result.duration = DateTime.now().difference(result.startedAt);
      onUpdate(result);
      await cancel(result.id);
    }
  }

  Future<void> sendWs(String sessionId, String text) async {
    final ch = _ws[sessionId];
    if (ch == null) return;
    ch.sink.add(text);
  }

  Future<void> cancel(String id) async {
    await _subs.remove(id)?.cancel();
    final client = _clients.remove(id);
    client?.close();
    final sink = _downloadSinks.remove(id);
    await sink?.flush();
    await sink?.close();
    final ws = _ws.remove(id);
    await ws?.sink.close();
  }

  Future<void> dispose() async {
    for (final id in [..._clients.keys, ..._ws.keys, ..._subs.keys]) {
      await cancel(id);
    }
  }

  Future<List<int>?> _buildBody(ParsedRequest req, String? workingDirectory) async {
    final body = req.body.trim();
    if (body.isEmpty && req.inputFile == null) return null;

    if (req.inputFile != null || body.startsWith('<')) {
      final path = req.inputFile ?? body.replaceFirst(RegExp(r'^<\s*'), '').trim();
      final file = File(p.isAbsolute(path)
          ? path
          : p.join(workingDirectory ?? Directory.current.path, path));
      if (!await file.exists()) {
        throw FileSystemException('请求体文件不存在', file.path);
      }
      return file.readAsBytes();
    }
    return utf8.encode(req.body);
  }

  String _decodeBody(List<int> bytes, Map<String, String> headers) {
    if (bytes.isEmpty) return '';
    final ct = headers.entries
        .firstWhere(
          (e) => e.key.toLowerCase() == 'content-type',
          orElse: () => const MapEntry('', ''),
        )
        .value
        .toLowerCase();
    if (ct.contains('charset=gbk') || ct.contains('charset=gb2312')) {
      // 简单回退到 latin1 显示，避免崩溃
      return latin1.decode(bytes, allowInvalid: true);
    }
    try {
      final text = utf8.decode(bytes);
      if (looksLikeJson(text)) return prettyJson(text);
      return text;
    } catch (_) {
      return '（二进制内容 ${formatBytes(bytes.length)}）\n${base64Encode(bytes.take(256).toList())}${bytes.length > 256 ? '...' : ''}';
    }
  }

  String _resolveDownloadName(
    ParsedRequest req,
    Uri uri,
    Map<String, String> headers,
  ) {
    if (req.outputFile != null && req.outputFile!.trim().isNotEmpty) {
      return VariableInterpolator.interpolate(req.outputFile!, {});
    }
    final cd = headers.entries
        .firstWhere(
          (e) => e.key.toLowerCase() == 'content-disposition',
          orElse: () => const MapEntry('', ''),
        )
        .value;
    final m = RegExp(r'filename\*?=([^;]+)', caseSensitive: false).firstMatch(cd);
    if (m != null) {
      var name = m.group(1)!.trim();
      name = name.replaceAll('"', '').replaceFirst(RegExp(r"^UTF-8''", caseSensitive: false), '');
      if (name.isNotEmpty) return name;
    }
    final seg = uri.pathSegments.isNotEmpty ? uri.pathSegments.last : 'download.bin';
    if (seg.isEmpty) return 'download_${DateTime.now().millisecondsSinceEpoch}.bin';
    return seg;
  }
}
