import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';

import '../format/krec.dart';
import '../models/app_settings.dart';
import '../ui/dialogs.dart';
import '../util.dart';
import 'log_service.dart';
import 'native_bridge.dart';
import 'update_service.dart';

enum RunActivity { idle, countdown, recording, playing }

class AppController extends ChangeNotifier {
  AppController({
    NativeBridge? native,
    UpdateService? updates,
  })  : native = native ?? NativeBridge(),
        updates = updates ?? UpdateService();

  final NativeBridge native;
  final UpdateService updates;
  final navigatorKey = GlobalKey<NavigatorState>();

  LogService? logs;
  SettingsStore? _settingsStore;
  AppSettings settings = AppSettings.fallback;
  String exeDir = '';
  String version = '1.0.0';
  String? initError;
  String? availableVersion;
  String updateMessage = '';
  bool updating = false;

  int page = 0;
  RunActivity activity = RunActivity.idle;
  bool paused = false;
  List<RecordingMeta> recordings = [];
  String? selectedPath;
  int captureElapsedUs = 0;
  int captureEvents = 0;
  int playElapsedUs = 0;
  int playLoop = 0;
  RecordingMeta? currentPlay;

  bool _prompting = false;
  bool _finishingCapture = false;
  bool _cancelCountdown = false;
  int _playToken = 0;
  String _cacheName = '';

  String get recordingsDir => joinPath(exeDir, 'recordings');
  String get cachePath => joinPath(recordingsDir, '_cache.krec');

  RecordingMeta? get selected {
    for (final item in recordings) {
      if (item.path == selectedPath) return item;
    }
    return recordings.isEmpty ? null : recordings.first;
  }

  String get banner {
    switch (activity) {
      case RunActivity.countdown:
        return '即将开始录制';
      case RunActivity.recording:
        return '正在录制 ${formatClock(captureElapsedUs)} · $captureEvents 个事件';
      case RunActivity.playing:
        final name = currentPlay?.name ?? '';
        final pause = paused ? ' · 已暂停' : '';
        return '正在播放 $name ${formatClock(playElapsedUs)} · 第 $playLoop 次$pause';
      case RunActivity.idle:
        return '';
    }
  }

  Future<void> init() async {
    native.onEvent = _onNative;
    native.bind();
    try {
      exeDir = await native.exeDir();
    } catch (error) {
      exeDir = File(Platform.resolvedExecutable).parent.path;
      debugError('读取程序目录失败', error);
    }
    if (exeDir.isEmpty) {
      initError = '找不到程序所在目录。';
      notifyListeners();
      return;
    }
    final logDir = joinPath(exeDir, 'logs');
    logs = LogService(logDir);
    try {
      await Directory(logDir).create(recursive: true);
      await Directory(recordingsDir).create(recursive: true);
      final probe = File(joinPath(exeDir, '.write_probe'));
      await probe.writeAsString('ok');
      await probe.delete();
    } catch (error) {
      initError = '程序所在目录不可写。请把 Kacher 放到可写文件夹，缓存和日志会保存在 exe 旁边。';
      logs?.error('目录不可写', error);
      notifyListeners();
      return;
    }
    _settingsStore = SettingsStore(joinPath(exeDir, 'settings.json'));
    try {
      settings = await _settingsStore!.load();
    } catch (error) {
      logs?.error('读取设置失败', error);
      settings = AppSettings.fallback;
    }
    await logs!.purge(settings.logRetentionDays);
    try {
      final fromFile = await native.fileVersion();
      if (fromFile.isNotEmpty) version = fromFile;
    } catch (error) {
      logs?.error('读取版本失败', error);
    }
    try {
      await native.setStartup(settings.runAtStartup);
    } catch (error) {
      logs?.error('同步开机自启失败', error);
    }
    await reload();
    logs!.info('启动 $version，数据目录 $exeDir');
    notifyListeners();
  }

  void setPage(int index) {
    page = index;
    notifyListeners();
  }

  Future<void> reload() async {
    try {
      recordings = await Krec.list(recordingsDir);
    } catch (error) {
      logs?.error('读取录制列表失败', error);
      recordings = [];
    }
    if (selectedPath != null && recordings.every((item) => item.path != selectedPath)) {
      selectedPath = null;
    }
    if (selectedPath == null && recordings.isNotEmpty) {
      selectedPath = recordings.first.path;
    }
    notifyListeners();
  }

  void select(RecordingMeta item) {
    selectedPath = item.path;
    notifyListeners();
  }

  Future<void> runCommand(String raw) async {
    final key = raw.trim().toLowerCase();
    switch (key) {
      case '操作录制':
      case '录制':
      case 'record':
      case 'rec':
        await requestRecord();
        break;
      case '播放':
      case 'play':
        await playCurrent();
        break;
      case '停止':
      case 'stop':
        await stopActive();
        break;
      case '暂停':
      case 'pause':
        await togglePause();
        break;
      case '已录制操作':
      case '已录制':
        setPage(1);
        break;
      case '设置':
      case 'settings':
        setPage(2);
        break;
      default:
        toast('未知命令。可用：操作录制、播放、停止、暂停、已录制操作、设置');
    }
  }

  Future<void> requestRecord() async {
    if (activity != RunActivity.idle || _prompting) {
      toast('请先结束当前录制或播放');
      return;
    }
    final context = navigatorKey.currentContext;
    if (context == null) return;
    _prompting = true;
    var accepted = false;
    try {
      accepted = await showRecordWarning(context);
    } finally {
      _prompting = false;
    }
    if (!accepted || activity != RunActivity.idle) return;
    await _countdownThenRecord();
  }

  Future<void> _countdownThenRecord() async {
    _cancelCountdown = false;
    activity = RunActivity.countdown;
    notifyListeners();
    try {
      await native.showOverlay(mode: 'countdown', title: '3', subtitle: '即将开始录制');
      await native.minimize();
      final watch = Stopwatch()..start();
      var shown = 0;
      while (watch.elapsedMilliseconds < 3000) {
        if (_cancelCountdown) {
          await _abortCountdown();
          return;
        }
        final left = 3 - watch.elapsedMilliseconds ~/ 1000;
        if (left != shown && left >= 1) {
          shown = left;
          await native.updateOverlay(title: '$left', subtitle: '即将开始录制');
        }
        await Future<void>.delayed(const Duration(milliseconds: 50));
      }
      if (_cancelCountdown) {
        await _abortCountdown();
        return;
      }
      await _beginCapture();
    } catch (error) {
      logs?.error('进入录制失败', error);
      await _abortCountdown();
      toast('无法开始录制');
    }
  }

  Future<void> _beginCapture() async {
    _cacheName = '操作-${formatStamp(DateTime.now())}';
    await native.beginCapture(cachePath, _cacheName);
    activity = RunActivity.recording;
    captureElapsedUs = 0;
    captureEvents = 0;
    notifyListeners();
    await native.showOverlay(
      mode: 'recording',
      title: '录制中',
      subtitle: '点击结束，或在图标上停留 5 秒',
    );
    logs?.info('开始录制 $_cacheName');
  }

  Future<void> _abortCountdown() async {
    activity = RunActivity.idle;
    _cancelCountdown = false;
    notifyListeners();
    try {
      await native.hideOverlay();
      await native.restore();
    } catch (error) {
      logs?.error('取消倒计时失败', error);
    }
  }

  Future<void> stopActive() async {
    if (activity == RunActivity.countdown) {
      _cancelCountdown = true;
      return;
    }
    if (activity == RunActivity.recording) {
      await _finishRecording();
      return;
    }
    if (activity == RunActivity.playing) {
      try {
        await native.stopPlayback();
      } catch (error) {
        logs?.error('停止播放失败', error);
      }
    }
  }

  Future<void> _finishRecording() async {
    if (_finishingCapture) return;
    _finishingCapture = true;
    try {
      CaptureResult? result;
      try {
        result = await native.endCapture();
      } catch (error) {
        logs?.error('结束录制失败', error);
      }
      try {
        await native.hideOverlay();
        await native.restore();
      } catch (error) {
        logs?.error('恢复窗口失败', error);
      }
      activity = RunActivity.idle;
      notifyListeners();
      final ended = result;
      if (ended == null || ended.eventCount <= 0) {
        await _deleteIfExists(cachePath);
        toast('没有录到操作');
        return;
      }
      final summary = '${formatClock(ended.durationUs)} · ${ended.eventCount} 个事件';
      final context = navigatorKey.currentContext;
      if (context == null || !context.mounted) return;
      final name = await showSaveRecordingDialog(
        context,
        initialName: _cacheName,
        summary: summary.trim(),
      );
      if (name == null) {
        await _deleteIfExists(cachePath);
        logs?.info('放弃保存录制');
        toast('已放弃这次录制');
        return;
      }
      final safe = sanitizeFileName(name);
      await native.updateMeta(
        path: cachePath,
        name: safe,
        playbackMode: kAfterNone,
        loopIntervalMs: 1000,
        loopCount: 0,
      );
      final dest = _uniquePath(safe);
      await File(cachePath).rename(dest);
      selectedPath = dest;
      await reload();
      page = 1;
      logs?.info('保存录制 $safe，事件 ${ended.eventCount}，丢弃 ${ended.dropped}');
      toast('已保存 $safe');
    } catch (error) {
      logs?.error('保存录制失败', error);
      toast('保存失败，缓存文件仍留在 recordings\\_cache.krec');
    } finally {
      _finishingCapture = false;
      notifyListeners();
    }
  }

  Future<void> playCurrent() async {
    final item = selected;
    if (item == null) {
      toast('没有可播放的操作');
      return;
    }
    await play(item);
  }

  Future<void> play(RecordingMeta item) async {
    if (activity != RunActivity.idle) {
      toast('请先结束当前录制或播放');
      return;
    }
    if (item.playbackMode == kAfterShutdown) {
      final context = navigatorKey.currentContext;
      if (context == null) return;
      final ok = await showConfirm(context, '播放完成后将关闭计算机。确认播放？');
      if (!ok || activity != RunActivity.idle) return;
    }
    final token = ++_playToken;
    currentPlay = item;
    selectedPath = item.path;
    activity = RunActivity.playing;
    paused = false;
    playElapsedUs = 0;
    playLoop = 1;
    notifyListeners();
    try {
      await native.showOverlay(mode: 'playing', title: item.name, subtitle: '准备播放');
      await native.minimize();
      final start = await native.play(
        path: item.path,
        after: item.playbackMode,
        intervalMs: item.loopIntervalMs,
        count: item.loopCount,
        token: token,
      );
      logs?.info('开始播放 ${item.name}');
      if (item.hasGamepad && start.gamepadSkipped) {
        toast('这段录制含手柄操作。未找到可用的 ViGEm，回放时会跳过手柄。');
      }
    } catch (error) {
      logs?.error('播放失败', error);
      activity = RunActivity.idle;
      paused = false;
      notifyListeners();
      try {
        await native.hideOverlay();
        await native.restore();
      } catch (_) {}
      toast('无法播放');
    }
  }

  Future<void> togglePause() async {
    if (activity != RunActivity.playing) return;
    paused = !paused;
    notifyListeners();
    try {
      await native.setPaused(paused);
    } catch (error) {
      logs?.error('暂停失败', error);
    }
  }

  Future<void> setPlayback(
    RecordingMeta item, {
    required int mode,
    required int intervalMs,
    required int count,
  }) async {
    try {
      await native.updateMeta(
        path: item.path,
        name: item.name,
        playbackMode: mode,
        loopIntervalMs: intervalMs,
        loopCount: count,
      );
      await reload();
    } catch (error) {
      logs?.error('保存播放设置失败', error);
      toast('播放设置没有写入文件');
    }
  }

  Future<void> rename(RecordingMeta item, String name) async {
    final safe = sanitizeFileName(name);
    try {
      await native.updateMeta(
        path: item.path,
        name: safe,
        playbackMode: item.playbackMode,
        loopIntervalMs: item.loopIntervalMs,
        loopCount: item.loopCount,
      );
      final dest = _uniquePath(safe, except: item.path);
      if (!samePath(dest, item.path)) {
        await File(item.path).rename(dest);
        if (selectedPath == item.path) selectedPath = dest;
      }
      await reload();
      toast('已重命名为 $safe');
    } catch (error) {
      logs?.error('重命名失败', error);
      toast('重命名失败');
    }
  }

  Future<void> deleteRecording(RecordingMeta item) async {
    try {
      if (activity == RunActivity.playing && currentPlay?.path == item.path) {
        await native.stopPlayback();
      }
      await File(item.path).delete();
      if (selectedPath == item.path) selectedPath = null;
      await reload();
      logs?.info('删除录制 ${item.name}');
    } catch (error) {
      logs?.error('删除失败', error);
      toast('删除失败');
    }
  }

  Future<void> saveSettings(AppSettings next) async {
    settings = next;
    notifyListeners();
    try {
      await _settingsStore?.save(next);
      await native.setStartup(next.runAtStartup);
      await logs?.purge(next.logRetentionDays);
      logs?.info('设置已保存');
    } catch (error) {
      logs?.error('保存设置失败', error);
      toast('设置保存失败');
    }
  }

  Future<void> promptRecovery() async {
    final file = File(cachePath);
    if (!await file.exists()) return;
    final length = await file.length();
    if (length <= kHeaderSize) {
      await file.delete();
      return;
    }
    var meta = await Krec.readMeta(file.path);
    if (meta != null && meta.eventCount == 0) {
      try {
        await native.updateMeta(
          path: file.path,
          name: meta.name,
          playbackMode: meta.playbackMode,
          loopIntervalMs: meta.loopIntervalMs,
          loopCount: meta.loopCount,
          repair: true,
        );
        meta = await Krec.readMeta(file.path);
      } catch (error) {
        logs?.error('修复缓存失败', error);
      }
    }
    if (meta == null || meta.eventCount == 0) {
      await file.delete();
      return;
    }
    final context = navigatorKey.currentContext;
    if (context == null || !context.mounted) return;
    final keep = await showConfirm(
      context,
      '发现未保存的录制「${meta.name}」，共 ${meta.eventCount} 个事件。要恢复吗？',
    );
    if (keep) {
      final safe = sanitizeFileName('未保存-${formatStamp(DateTime.now())}');
      await native.updateMeta(
        path: file.path,
        name: safe,
        playbackMode: kAfterNone,
        loopIntervalMs: 1000,
        loopCount: 0,
      );
      final dest = _uniquePath(safe);
      await file.rename(dest);
      selectedPath = dest;
      page = 1;
      await reload();
      toast('已恢复未保存的录制');
    } else {
      await file.delete();
    }
  }

  Future<void> checkUpdate({required bool manual}) async {
    if (updating) return;
    if (activity != RunActivity.idle) {
      if (manual) toast('请先结束当前录制或播放');
      return;
    }
    try {
      final remote = await updates.fetchRemoteVersion(settings.versionCheckUrl);
      if (remote == null) {
        logs?.info('检查更新没有读到版本号');
        if (manual) toast('没有读到远程版本号');
        return;
      }
      if (compareVersion(remote, version) <= 0) {
        updateMessage = '已是最新版本 $version';
        availableVersion = null;
        notifyListeners();
        if (manual) toast(updateMessage);
        return;
      }
      availableVersion = remote;
      updateMessage = '发现新版本 $remote';
      notifyListeners();
      logs?.info('发现新版本 $remote，当前 $version');
      if (!settings.autoUpdate && !manual) return;
      await _downloadAndSwap(remote);
    } catch (error) {
      logs?.error('检查更新失败', error);
      if (manual) toast('检查更新失败');
    }
  }

  Future<void> openDataFolder() async {
    await Process.run('explorer.exe', [exeDir]);
  }

  void toast(String message) {
    final context = navigatorKey.currentContext;
    if (context == null || !context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  void _onNative(String method, Object? args) {
    final map = args is Map ? Map<String, dynamic>.from(args) : <String, dynamic>{};
    switch (method) {
      case 'onHotkey':
        unawaited(_onHotkey('${map['action'] ?? ''}'));
        break;
      case 'onOverlay':
        unawaited(_onOverlay('${map['action'] ?? ''}'));
        break;
      case 'onCaptureStats':
        captureElapsedUs = _asInt(map['durationUs']);
        captureEvents = _asInt(map['eventCount']);
        if (activity == RunActivity.recording) notifyListeners();
        break;
      case 'onPlaybackStats':
        playElapsedUs = _asInt(map['elapsedUs']);
        playLoop = _asInt(map['loop']);
        paused = map['paused'] == true;
        if (activity == RunActivity.playing) notifyListeners();
        break;
      case 'onPlaybackDone':
        unawaited(_onPlaybackDone(map));
        break;
    }
  }

  Future<void> _onHotkey(String action) async {
    switch (action) {
      case 'record':
        await requestRecord();
        break;
      case 'stop':
        await stopActive();
        break;
      case 'play':
        await playCurrent();
        break;
      case 'pause':
        await togglePause();
        break;
    }
  }

  Future<void> _onOverlay(String action) async {
    if (activity == RunActivity.countdown && action == 'click') {
      _cancelCountdown = true;
      return;
    }
    if (activity == RunActivity.recording && (action == 'click' || action == 'hover')) {
      await stopActive();
      return;
    }
    if (activity == RunActivity.playing && action == 'click') {
      await stopActive();
    }
  }

  Future<void> _onPlaybackDone(Map<String, dynamic> map) async {
    final token = _asInt(map['token']);
    if (token != _playToken || activity != RunActivity.playing) return;
    final reason = '${map['reason'] ?? 'stopped'}';
    final after = currentPlay?.playbackMode ?? kAfterNone;
    activity = RunActivity.idle;
    paused = false;
    notifyListeners();
    try {
      await native.hideOverlay();
      await native.restore();
    } catch (error) {
      logs?.error('播放结束后恢复窗口失败', error);
    }
    logs?.info('播放结束 $reason');
    if (reason == 'finished' && after == kAfterShutdown) {
      logs?.info('播放完成，执行关机');
      try {
        final ok = await native.shutdown();
        if (!ok) toast('关机请求没有被系统接受');
      } catch (error) {
        logs?.error('关机失败', error);
        toast('关机失败');
      }
    }
  }

  Future<void> _downloadAndSwap(String remote) async {
    updating = true;
    notifyListeners();
    var showed = false;
    final context = navigatorKey.currentContext;
    if (context != null && context.mounted) {
      showed = true;
      unawaited(showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('正在更新'),
          content: Text('正在下载 $remote，完成后会替换程序并重新打开。'),
        ),
      ));
    }
    try {
      final dest = joinPath(exeDir, 'kacher.update.exe');
      await updates.download(settings.updateUrl, dest);
      final downloaded = await native.readFileVersion(dest);
      if (downloaded.isEmpty || compareVersion(downloaded, version) <= 0) {
        await _deleteIfExists(dest);
        logs?.error('更新包版本无效：$downloaded');
        toast('下载的程序并不比当前版本新，已取消替换');
        return;
      }
      await updates.launchSwap(
        pid: pid,
        source: dest,
        destination: Platform.resolvedExecutable,
        scriptPath: joinPath(exeDir, 'update.ps1'),
      );
      logs?.info('开始替换为 $downloaded');
      await Future<void>.delayed(const Duration(milliseconds: 500));
      exit(0);
    } catch (error) {
      logs?.error('下载更新失败', error);
      toast('更新失败');
    } finally {
      updating = false;
      if (showed) navigatorKey.currentState?.pop();
      notifyListeners();
    }
  }

  String _uniquePath(String safe, {String? except}) {
    var candidate = joinPath(recordingsDir, '$safe.krec');
    if (except != null && samePath(candidate, except)) return except;
    var index = 2;
    while (File(candidate).existsSync()) {
      if (except != null && samePath(candidate, except)) return except;
      candidate = joinPath(recordingsDir, '$safe-$index.krec');
      index += 1;
    }
    return candidate;
  }

  Future<void> _deleteIfExists(String path) async {
    final file = File(path);
    if (await file.exists()) await file.delete();
  }

  void debugError(String message, Object error) {
    logs?.error(message, error);
  }
}

int _asInt(Object? value) => value is num ? value.toInt() : 0;
