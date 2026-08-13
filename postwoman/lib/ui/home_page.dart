import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/api_request.dart';
import '../models/api_response.dart';
import '../models/kv_pair.dart';
import '../services/curl.dart';
import '../services/engine.dart';
import '../services/history.dart';
import 'curl_dialog.dart';
import 'kv_editor.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  static const _mono = TextStyle(
    fontFamily: 'Consolas',
    fontSize: 13,
    fontFamilyFallback: ['Courier New', 'monospace'],
  );

  final _urlCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  final _wsCtrl = TextEditingController();
  final _urlFocus = FocusNode();

  ApiRequest _req = ApiRequest.empty();
  ResponseState _res = ResponseState();
  RequestSession _session = RequestSession();
  List<HistoryItem> _history = [];
  bool _prettyJson = true;
  int _reqTab = 0;
  int _resTab = 0;

  bool get _busy => _res.streaming || _res.wsConnected;

  @override
  void initState() {
    super.initState();
    _urlCtrl.text = _req.url;
    _bodyCtrl.text = _req.body;
    HistoryStore.load().then((items) {
      if (mounted) setState(() => _history = items);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _urlFocus.requestFocus());
  }

  @override
  void dispose() {
    _session.cancel();
    _urlCtrl.dispose();
    _bodyCtrl.dispose();
    _wsCtrl.dispose();
    _urlFocus.dispose();
    super.dispose();
  }

  void _syncReqFromInputs() {
    _req.url = _urlCtrl.text.trim();
    _req.body = _bodyCtrl.text;
  }

  void _applyRequest(ApiRequest req) {
    _req = req;
    if (_req.params.isEmpty) _req.params.add(KvPair());
    if (_req.headers.isEmpty) _req.headers.add(KvPair());
    if (_req.formFields.isEmpty) _req.formFields.add(KvPair());
    _urlCtrl.text = _req.url;
    _bodyCtrl.text = _req.body;
  }

  void _onPatch(RequestSession session, ResponsePatch patch) {
    if (!mounted || session != _session) return;
    setState(() => patch.apply(_res));
  }

  Future<void> _send() async {
    if (_busy && !_res.wsConnected) return;
    if (_res.wsConnected) {
      _session.cancel();
      setState(() {
        _res.wsConnected = false;
        _res.streaming = false;
        _res.done = true;
      });
      return;
    }

    _syncReqFromInputs();
    if (_req.url.trim().isEmpty) {
      _toast('请填写 URL');
      return;
    }

    _session.cancel();
    final session = RequestSession();
    _session = session;
    setState(() {
      _res = ResponseState()..streaming = true;
      _resTab = 0;
    });

    try {
      _history = await HistoryStore.add(_req);
    } catch (_) {}

    await sendRequest(
      request: _req,
      session: session,
      onPatch: (p) => _onPatch(session, p),
    );
  }

  void _stop() {
    _session.cancel();
    setState(() {
      _res.streaming = false;
      _res.wsConnected = false;
      _res.done = true;
      _res.error ??= '已取消';
    });
  }

  Future<void> _sendWs() async {
    final text = _wsCtrl.text;
    if (text.isEmpty || !_res.wsConnected) return;
    try {
      await sendWsMessage(_session, text);
      setState(() {
        _res.wsLines.add(WsLine(time: DateTime.now(), outgoing: true, text: text));
      });
      _wsCtrl.clear();
    } catch (e) {
      _toast('$e');
    }
  }

  Future<void> _importCurl() async {
    final raw = await showCurlImportDialog(context);
    if (raw == null || raw.trim().isEmpty || !mounted) return;
    try {
      final parsed = parseCurl(raw);
      setState(() => _applyRequest(parsed));
      _toast('已导入 curl');
    } catch (e) {
      _toast('解析失败：$e');
    }
  }

  Future<void> _copyCurl() async {
    _syncReqFromInputs();
    try {
      await Clipboard.setData(ClipboardData(text: encodeCurl(_req)));
      _toast('已复制 curl');
    } catch (e) {
      _toast('复制失败：$e');
    }
  }

  Future<void> _copyBody() async {
    final text = _displayBody();
    if (text.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: text));
    _toast('已复制响应正文');
  }

  Future<void> _saveBody() async {
    if (_res.bodyBytes.isEmpty && _res.bodyText.isEmpty) return;
    final downloads = Platform.environment['USERPROFILE'];
    if (downloads == null) {
      _toast('找不到下载目录');
      return;
    }
    final ext = _res.isImage
        ? _imageExt(_res.contentType)
        : (_res.isJson ? 'json' : 'txt');
    final path =
        '$downloads${Platform.pathSeparator}Downloads${Platform.pathSeparator}postwoman_${DateTime.now().millisecondsSinceEpoch}.$ext';
    final file = File(path);
    if (_res.bodyBytes.isNotEmpty) {
      await file.writeAsBytes(_res.bodyBytes);
    } else {
      await file.writeAsString(_res.bodyText);
    }
    _toast('已保存到 $path');
  }

  void _prettyBody() {
    try {
      final v = json.decode(_bodyCtrl.text);
      setState(() {
        _bodyCtrl.text = const JsonEncoder.withIndent('  ').convert(v);
        _req.bodyType = BodyType.json;
      });
    } catch (_) {
      _toast('不是合法 JSON');
    }
  }

  String _displayBody() {
    var text = _res.bodyText;
    if (text.isEmpty) return '';
    if (_prettyJson) {
      try {
        final v = json.decode(text);
        text = const JsonEncoder.withIndent('  ').convert(v);
      } catch (_) {}
    }
    const limit = 400000;
    if (text.length > limit) {
      return '${text.substring(0, limit)}\n\n… 正文过长，已截断显示（共 ${text.length} 字符）';
    }
    return text;
  }

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.enter, control: true): _send,
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          body: Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
            child: Column(
              children: [
                _buildTopBar(),
                const SizedBox(height: 8),
                Expanded(
                  flex: 5,
                  child: _buildRequestPane(),
                ),
                const SizedBox(height: 8),
                Expanded(
                  flex: 6,
                  child: _buildResponsePane(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Row(
      children: [
        const Text('Postwoman', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        const SizedBox(width: 12),
        SizedBox(
          width: 136,
          child: DropdownButtonFormField<String>(
            isExpanded: true,
            value: allMethods.contains(_req.method) ? _req.method : 'GET',
            decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8)),
            items: [
              for (final m in allMethods)
                DropdownMenuItem(value: m, child: Text(m, style: const TextStyle(fontWeight: FontWeight.w600))),
            ],
            onChanged: _busy
                ? null
                : (v) {
                    if (v == null) return;
                    setState(() => _req.method = v);
                  },
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: TextField(
            controller: _urlCtrl,
            focusNode: _urlFocus,
            style: _mono,
            decoration: const InputDecoration(
              hintText: 'https://httpbin.org/get  或  ws://echo.websocket.events',
            ),
            onSubmitted: (_) => _send(),
          ),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: (_busy && !_res.wsConnected) ? null : _send,
          child: Text(_res.wsConnected ? '断开' : (_req.isWebSocket ? '连接' : '发送')),
        ),
        if (_busy) ...[
          const SizedBox(width: 6),
          OutlinedButton(onPressed: _stop, child: const Text('停止')),
        ],
        const SizedBox(width: 6),
        OutlinedButton(onPressed: _importCurl, child: const Text('导入 curl')),
        const SizedBox(width: 6),
        OutlinedButton(onPressed: _copyCurl, child: const Text('复制 curl')),
      ],
    );
  }

  Widget _buildRequestPane() {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
        child: Column(
          children: [
            Row(
              children: [
                _tabChip(0, '参数'),
                _tabChip(1, '请求头'),
                _tabChip(2, '请求体'),
                _tabChip(3, '设置'),
                const Spacer(),
                _historyMenu(),
              ],
            ),
            const SizedBox(height: 6),
            Expanded(child: _buildReqTab()),
          ],
        ),
      ),
    );
  }

  Widget _tabChip(int index, String label) {
    final selected = _reqTab == index;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        visualDensity: VisualDensity.compact,
        onSelected: (_) => setState(() => _reqTab = index),
      ),
    );
  }

  Widget _historyMenu() {
    return PopupMenuButton<int>(
      tooltip: '历史',
      enabled: _history.isNotEmpty,
      onSelected: (i) {
        setState(() => _applyRequest(_history[i].request.copy()));
      },
      itemBuilder: (context) {
        if (_history.isEmpty) {
          return [const PopupMenuItem(enabled: false, child: Text('暂无历史'))];
        }
        return [
          for (var i = 0; i < _history.length; i++)
            PopupMenuItem(
              value: i,
              child: Text(
                '${_history[i].request.method}  ${_history[i].request.url}',
                overflow: TextOverflow.ellipsis,
                style: _mono.copyWith(fontSize: 12),
              ),
            ),
        ];
      },
      child: const Padding(
        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          children: [
            Icon(Icons.history, size: 16),
            SizedBox(width: 4),
            Text('历史'),
            Icon(Icons.arrow_drop_down, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _buildReqTab() {
    switch (_reqTab) {
      case 0:
        return KvEditor(items: _req.params, keyHint: '查询参数名', valueHint: '值');
      case 1:
        return KvEditor(items: _req.headers, keyHint: 'Header', valueHint: 'Value');
      case 2:
        return _buildBodyEditor();
      default:
        return _buildSettings();
    }
  }

  Widget _buildBodyEditor() {
    if (_req.isWebSocket) {
      return const Center(child: Text('WebSocket 连接后，在响应区域发送消息。'));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            SizedBox(
              width: 220,
              child: DropdownButtonFormField<BodyType>(
                value: _req.bodyType,
                decoration: const InputDecoration(labelText: '类型'),
                items: const [
                  DropdownMenuItem(value: BodyType.none, child: Text('无')),
                  DropdownMenuItem(value: BodyType.json, child: Text('JSON')),
                  DropdownMenuItem(value: BodyType.text, child: Text('文本')),
                  DropdownMenuItem(value: BodyType.form, child: Text('x-www-form-urlencoded')),
                  DropdownMenuItem(value: BodyType.multipart, child: Text('multipart/form-data')),
                ],
                onChanged: (v) {
                  if (v == null) return;
                  setState(() => _req.bodyType = v);
                },
              ),
            ),
            const SizedBox(width: 8),
            if (_req.bodyType == BodyType.json)
              TextButton(onPressed: _prettyBody, child: const Text('格式化 JSON')),
            if (_req.bodyType == BodyType.multipart)
              const Text('文件字段把值写成 @C:\\path\\file.bin', style: TextStyle(fontSize: 12)),
          ],
        ),
        const SizedBox(height: 8),
        Expanded(child: _bodyContent()),
      ],
    );
  }

  Widget _bodyContent() {
    switch (_req.bodyType) {
      case BodyType.none:
        return const Center(child: Text('该请求不发送 body'));
      case BodyType.form:
      case BodyType.multipart:
        return KvEditor(
          items: _req.formFields,
          keyHint: '字段名',
          valueHint: _req.bodyType == BodyType.multipart ? '值 或 @文件路径' : '值',
        );
      case BodyType.json:
      case BodyType.text:
        return TextField(
          controller: _bodyCtrl,
          maxLines: null,
          expands: true,
          textAlignVertical: TextAlignVertical.top,
          style: _mono,
          decoration: InputDecoration(
            hintText: _req.bodyType == BodyType.json ? '{ "key": "value" }' : '请求体',
          ),
        );
    }
  }

  Widget _buildSettings() {
    return ListView(
      children: [
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('忽略 SSL 证书错误'),
          subtitle: const Text('相当于 curl -k，仅用于本地/自签名证书'),
          value: _req.insecureSsl,
          onChanged: (v) => setState(() => _req.insecureSsl = v),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('跟随重定向'),
          value: _req.followRedirects,
          onChanged: (v) => setState(() => _req.followRedirects = v),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            const Text('超时（秒）'),
            const SizedBox(width: 12),
            SizedBox(
              width: 100,
              child: TextFormField(
                initialValue: '${_req.timeoutSeconds}',
                keyboardType: TextInputType.number,
                onChanged: (v) {
                  final n = int.tryParse(v);
                  if (n != null && n > 0) _req.timeoutSeconds = n;
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const Text('Ctrl+Enter 发送。通信层使用 Dart SDK 的 HttpClient / WebSocket，支持流式响应（含 SSE）。'),
      ],
    );
  }

  Widget _buildResponsePane() {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
        child: Column(
          children: [
            Row(
              children: [
                _statusChip(),
                const SizedBox(width: 10),
                Text(_fmtDuration(_res.elapsed), style: const TextStyle(fontSize: 12)),
                const SizedBox(width: 10),
                Text(_fmtBytes(_res.byteCount), style: const TextStyle(fontSize: 12)),
                if (_res.contentType.isNotEmpty) ...[
                  const SizedBox(width: 10),
                  Flexible(
                    child: Text(
                      _res.contentType,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
                if (_res.streaming) ...[
                  const SizedBox(width: 10),
                  const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                  const SizedBox(width: 6),
                  Text(_res.isSse ? 'SSE 接收中' : '接收中', style: const TextStyle(fontSize: 12)),
                ],
                if (_res.wsConnected) ...[
                  const SizedBox(width: 10),
                  const Text('已连接', style: TextStyle(fontSize: 12, color: Colors.lightGreenAccent)),
                ],
                const Spacer(),
                FilterChip(
                  label: const Text('格式化 JSON'),
                  selected: _prettyJson,
                  visualDensity: VisualDensity.compact,
                  onSelected: (v) => setState(() => _prettyJson = v),
                ),
                const SizedBox(width: 6),
                TextButton(onPressed: _copyBody, child: const Text('复制')),
                TextButton(onPressed: _saveBody, child: const Text('保存')),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                ChoiceChip(
                  label: Text(_req.isWebSocket ? '消息' : '正文'),
                  selected: _resTab == 0,
                  visualDensity: VisualDensity.compact,
                  onSelected: (_) => setState(() => _resTab = 0),
                ),
                const SizedBox(width: 6),
                ChoiceChip(
                  label: const Text('响应头'),
                  selected: _resTab == 1,
                  visualDensity: VisualDensity.compact,
                  onSelected: (_) => setState(() => _resTab = 1),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Expanded(child: _resTab == 0 ? _buildResBody() : _buildResHeaders()),
            if (_req.isWebSocket) _buildWsComposer(),
          ],
        ),
      ),
    );
  }

  Widget _statusChip() {
    Color color;
    if (_res.error != null && _res.statusCode == null) {
      color = Colors.redAccent;
    } else {
      final code = _res.statusCode ?? 0;
      color = switch (code) {
        >= 200 && < 300 => Colors.greenAccent,
        >= 300 && < 400 => Colors.amberAccent,
        >= 400 && < 500 => Colors.orangeAccent,
        >= 500 => Colors.redAccent,
        _ => Colors.blueGrey.shade200,
      };
    }
    return Text(
      _res.statusLabel,
      style: TextStyle(fontWeight: FontWeight.w700, color: color, fontSize: 15),
    );
  }

  Widget _buildResBody() {
    if (_res.error != null && _res.bodyText.isEmpty && _res.wsLines.isEmpty) {
      return Align(
        alignment: Alignment.topLeft,
        child: SelectableText(_res.error!, style: _mono.copyWith(color: Colors.redAccent)),
      );
    }
    if (_req.isWebSocket || _res.wsLines.isNotEmpty) {
      if (_res.wsLines.isEmpty) {
        return const Center(child: Text('连接后会在这里显示收发消息'));
      }
      return ListView.builder(
        itemCount: _res.wsLines.length,
        itemBuilder: (context, i) {
          final line = _res.wsLines[i];
          final prefix = line.outgoing ? '→' : '←';
          final color = line.outgoing ? Colors.lightBlueAccent : Colors.lightGreenAccent;
          return Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: SelectableText(
              '${_hhmmss(line.time)} $prefix ${line.binary ? '[binary] ' : ''}${line.text}',
              style: _mono.copyWith(color: color),
            ),
          );
        },
      );
    }
    if (_res.isImage && _res.bodyBytes.isNotEmpty) {
      return Center(
        child: Image.memory(
          Uint8List.fromList(_res.bodyBytes),
          errorBuilder: (_, __, ___) => SelectableText(_displayBody(), style: _mono),
        ),
      );
    }
    if (_res.bodyText.isEmpty && !_res.streaming) {
      return const Center(child: Text('点击发送以查看响应'));
    }
    return Align(
      alignment: Alignment.topLeft,
      child: SingleChildScrollView(
        child: SelectableText(_displayBody(), style: _mono),
      ),
    );
  }

  Widget _buildResHeaders() {
    if (_res.headers.isEmpty) {
      return const Center(child: Text('暂无响应头'));
    }
    final lines = _res.headers.entries.map((e) => '${e.key}: ${e.value}').join('\n');
    return Align(
      alignment: Alignment.topLeft,
      child: SelectableText(lines, style: _mono),
    );
  }

  Widget _buildWsComposer() {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _wsCtrl,
              enabled: _res.wsConnected,
              style: _mono,
              decoration: const InputDecoration(hintText: 'WebSocket 消息'),
              onSubmitted: (_) => _sendWs(),
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(onPressed: _res.wsConnected ? _sendWs : null, child: const Text('发消息')),
        ],
      ),
    );
  }
}

String _fmtDuration(Duration d) {
  if (d == Duration.zero) return '';
  if (d.inMilliseconds < 1000) return '${d.inMilliseconds} ms';
  return '${(d.inMilliseconds / 1000).toStringAsFixed(2)} s';
}

String _fmtBytes(int n) {
  if (n <= 0) return '';
  if (n < 1024) return '$n B';
  if (n < 1024 * 1024) return '${(n / 1024).toStringAsFixed(1)} KB';
  return '${(n / (1024 * 1024)).toStringAsFixed(1)} MB';
}

String _hhmmss(DateTime t) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(t.hour)}:${two(t.minute)}:${two(t.second)}';
}

String _imageExt(String contentType) {
  final ct = contentType.toLowerCase();
  if (ct.contains('png')) return 'png';
  if (ct.contains('jpeg') || ct.contains('jpg')) return 'jpg';
  if (ct.contains('gif')) return 'gif';
  if (ct.contains('webp')) return 'webp';
  return 'bin';
}
