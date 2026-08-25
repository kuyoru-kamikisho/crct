import 'dart:async';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../models/models.dart';
import '../parser/curl_importer.dart';
import '../parser/http_file_parser.dart';
import '../parser/http_formatter.dart';
import '../services/app_paths.dart';
import '../services/request_executor.dart';
import '../services/storage_service.dart';
import '../utils/helpers.dart';
import '../widgets/http_code_editor.dart';

class AppController extends ChangeNotifier {
  AppController({
    StorageService? storage,
    RequestExecutor? executor,
  })  : _storage = storage ?? StorageService(),
        _executor = executor ?? RequestExecutor();

  final StorageService _storage;
  final RequestExecutor _executor;

  final HighlightEditingController editorController = HighlightEditingController();
  Timer? _autosave;

  AppSettings settings = AppSettings();
  Map<String, Map<String, String>> environments = {};
  List<HistoryItem> history = [];
  ParsedDocument document = const ParsedDocument(requests: [], lineCount: 0);

  final List<ExecutionResult> results = [];
  final Map<String, List<WsMessage>> wsMessages = {};
  final Map<int, RequestRunStatus> lineStatus = {};
  String? activeResultId;
  String? activeWsSessionId;
  bool busy = false;
  String? currentFilePath;
  bool dirty = false;
  String statusMessage = '就绪';

  Map<String, String> get activeEnv {
    final name = settings.selectedEnv;
    if (name.isEmpty || !environments.containsKey(name)) return {};
    return environments[name]!;
  }

  List<String> get envNames => environments.keys.toList()..sort();

  ExecutionResult? get activeResult {
    if (activeResultId == null) return null;
    for (final r in results) {
      if (r.id == activeResultId) return r;
    }
    return null;
  }

  Future<void> init() async {
    await AppPaths.init();
    settings = await _storage.loadSettings();
    environments = await _storage.loadEnvironments();
    history = await _storage.loadHistory();
    if (settings.selectedEnv.isEmpty && environments.isNotEmpty) {
      settings.selectedEnv = environments.keys.first;
    }

    String? text;
    if (settings.lastFilePath.isNotEmpty) {
      final f = File(settings.lastFilePath);
      if (await f.exists()) {
        text = await f.readAsString();
        currentFilePath = settings.lastFilePath;
      }
    }
    text ??= await _storage.loadDraft();
    if (text == null || text.isEmpty) {
      text = await rootBundle.loadString('assets/examples.http');
    }
    editorController.text = text;
    _reparse();
    editorController.addListener(_onEditorChanged);
    notifyListeners();
  }

  void _onEditorChanged() {
    dirty = true;
    _reparse();
    _autosave?.cancel();
    _autosave = Timer(const Duration(milliseconds: 800), () async {
      await _storage.saveDraft(editorController.text);
      dirty = false;
      statusMessage = '草稿已自动保存';
      notifyListeners();
    });
    notifyListeners();
  }

  void _reparse() {
    document = HttpFileParser.parse(editorController.text);
  }

  Future<void> setThemeDark(bool dark) async {
    settings.darkTheme = dark;
    await _storage.saveSettings(settings);
    notifyListeners();
  }

  Future<void> selectEnv(String name) async {
    settings.selectedEnv = name;
    await _storage.saveSettings(settings);
    notifyListeners();
  }

  Future<void> saveEnvironments(Map<String, Map<String, String>> envs) async {
    environments = envs;
    if (!environments.containsKey(settings.selectedEnv) && environments.isNotEmpty) {
      settings.selectedEnv = environments.keys.first;
    }
    await _storage.saveEnvironments(environments);
    await _storage.saveSettings(settings);
    notifyListeners();
  }

  void setSplitRatio(double ratio) {
    settings.splitRatio = ratio.clamp(0.25, 0.85);
    notifyListeners();
  }

  Future<void> persistSplit() => _storage.saveSettings(settings);

  void formatDocument() {
    editorController.text = HttpFormatter.format(editorController.text);
    editorController.selection = TextSelection.collapsed(offset: editorController.text.length);
    statusMessage = '已格式化';
    notifyListeners();
  }

  Future<void> newFile() async {
    editorController.text = '###\nGET {{host}}/get\nAccept: application/json\n';
    currentFilePath = null;
    settings.lastFilePath = '';
    await _storage.saveSettings(settings);
    statusMessage = '新建文件';
    notifyListeners();
  }

  Future<void> openFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['http', 'rest', 'txt'],
      dialogTitle: '打开 HTTP 文件',
    );
    if (result == null || result.files.isEmpty) return;
    final path = result.files.single.path;
    if (path == null) return;
    final text = await File(path).readAsString();
    editorController.text = text;
    currentFilePath = path;
    settings.lastFilePath = path;
    await _storage.saveSettings(settings);
    statusMessage = '已打开 $path';
    notifyListeners();
  }

  Future<void> saveFile({bool saveAs = false}) async {
    var path = currentFilePath;
    if (saveAs || path == null) {
      path = await FilePicker.platform.saveFile(
        dialogTitle: '保存 HTTP 文件',
        fileName: 'requests.http',
        type: FileType.custom,
        allowedExtensions: const ['http'],
      );
      if (path == null) return;
      if (!path.toLowerCase().endsWith('.http')) path = '$path.http';
    }
    await File(path).writeAsString(editorController.text);
    currentFilePath = path;
    settings.lastFilePath = path;
    dirty = false;
    await _storage.saveSettings(settings);
    await _storage.saveDraft(editorController.text);
    statusMessage = '已保存 $path';
    notifyListeners();
  }

  String importCurl(String curl) {
    final httpText = CurlImporter.toHttp(curl);
    final existing = editorController.text.trimRight();
    final sep = existing.isEmpty ? '' : '\n\n';
    editorController.text = '$existing$sep$httpText';
    statusMessage = '已导入 curl';
    notifyListeners();
    return httpText;
  }

  Future<void> runAtLine(int line) async {
    final req = document.atLine(line);
    if (req == null) {
      statusMessage = '当前位置没有可执行请求';
      notifyListeners();
      return;
    }
    await _runOne(req);
  }

  Future<void> runAll() async {
    if (document.requests.isEmpty) {
      statusMessage = '没有可执行的请求';
      notifyListeners();
      return;
    }
    busy = true;
    statusMessage = '正在运行全部请求...';
    notifyListeners();
    for (final req in document.requests) {
      await _runOne(req);
    }
    busy = false;
    statusMessage = '全部请求已执行完成';
    notifyListeners();
  }

  Future<void> _runOne(ParsedRequest req) async {
    lineStatus[req.requestLine] = RequestRunStatus.running;
    statusMessage = '执行: ${req.displayName}';
    notifyListeners();

    final wd = currentFilePath != null
        ? File(currentFilePath!).parent.path
        : AppPaths.dataDir.path;

    final result = await _executor.execute(
      req,
      env: activeEnv,
      workingDirectory: wd,
      onUpdate: (r) {
        final idx = results.indexWhere((e) => e.id == r.id);
        if (idx >= 0) {
          results[idx] = r;
        } else {
          results.insert(0, r);
        }
        activeResultId = r.id;
        if (r.kind == RequestKind.websocket) {
          activeWsSessionId = r.id;
        }
        notifyListeners();
      },
      onWsMessage: (id, msg) {
        wsMessages.putIfAbsent(id, () => []).add(msg);
        notifyListeners();
      },
    );

    lineStatus[req.requestLine] =
        result.ok ? RequestRunStatus.success : RequestRunStatus.failure;

    final item = HistoryItem(
      id: result.id,
      time: result.startedAt,
      method: result.method,
      url: result.url,
      name: req.displayName,
      statusCode: result.statusCode,
      durationMs: result.duration.inMilliseconds,
      error: result.error,
      requestSnippet: '${req.method} ${req.composedUrl}',
      responseSnippet: (result.error ?? result.bodyText).length > 500
          ? '${(result.error ?? result.bodyText).substring(0, 500)}...'
          : (result.error ?? result.bodyText),
    );
    history.insert(0, item);
    if (history.length > 200) history = history.take(200).toList();
    await _storage.saveHistory(history);
    statusMessage = result.error != null
        ? '失败: ${result.error}'
        : '完成 ${result.statusCode ?? ''} (${formatDuration(result.duration)})';
    notifyListeners();
  }

  Future<void> cancelActive() async {
    final id = activeResultId;
    if (id == null) return;
    await _executor.cancel(id);
    final r = activeResult;
    if (r != null) {
      r.canceled = true;
      r.done = true;
      r.error ??= '已取消';
    }
    statusMessage = '已取消';
    notifyListeners();
  }

  Future<void> sendWsMessage(String text) async {
    final id = activeWsSessionId;
    if (id == null || text.trim().isEmpty) return;
    await _executor.sendWs(id, text);
    wsMessages.putIfAbsent(id, () => []).add(
          WsMessage(outgoing: true, text: text, time: DateTime.now()),
        );
    final r = results.cast<ExecutionResult?>().firstWhere(
          (e) => e?.id == id,
          orElse: () => null,
        );
    if (r != null) {
      r.bodyText += '>> $text\n';
    }
    notifyListeners();
  }

  Future<void> clearHistory() async {
    history.clear();
    await _storage.saveHistory(history);
    notifyListeners();
  }

  void selectResult(String id) {
    activeResultId = id;
    final r = activeResult;
    if (r?.kind == RequestKind.websocket) activeWsSessionId = id;
    notifyListeners();
  }

  void insertTemplate(String kind) {
    final templates = {
      'get': '### GET example\nGET {{host}}/get\nAccept: application/json\n',
      'post':
          '### POST json\nPOST {{host}}/post\nContent-Type: application/json\n\n{\n  "name": "{{username}}"\n}\n',
      'ws':
          '### WebSocket\nWEBSOCKET wss://echo.websocket.events\n\nhello from http_client\n',
      'sse':
          '### SSE\nSSE {{host}}/stream/3\nAccept: text/event-stream\n',
      'download':
          '### Download\nGET {{host}}/image/png\n# @download\n>> sample.png\n',
      'graphql':
          '### GraphQL\nGRAPHQL https://countries.trevorblades.com/\nContent-Type: application/json\n\n{\n  "query": "{ continents { code name } }"\n}\n',
    };
    final t = templates[kind];
    if (t == null) return;
    final cur = editorController.text.trimRight();
    editorController.text = cur.isEmpty ? t : '$cur\n\n$t';
    notifyListeners();
  }

  @override
  void dispose() {
    _autosave?.cancel();
    editorController.removeListener(_onEditorChanged);
    editorController.dispose();
    _executor.dispose();
    super.dispose();
  }
}
