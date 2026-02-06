import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';

final List<String> wsMessageStore = <String>[];

void main() {
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: KeyMonitorHome(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class KeyMonitorHome extends StatefulWidget {
  const KeyMonitorHome({super.key});

  @override
  State<KeyMonitorHome> createState() => _KeyMonitorHomeState();
}

class _KeyMonitorHomeState extends State<KeyMonitorHome> {
  final ScrollController _scrollController = ScrollController();
  final List<String> _logs = <String>[];
  final List<String> _pendingLogs = <String>[];
  static const int _maxLogs = 500;
  static const Duration _flushInterval = Duration(milliseconds: 50);

  Process? _keyMonitorProcess;
  StreamSubscription<List<int>>? _stdoutSub;
  StreamSubscription<List<int>>? _stderrSub;
  WebSocket? _ws;
  StreamSubscription? _wsSubscription;
  Timer? _flushTimer;
  Stopwatch? _wsUptime;
  bool _connecting = false;
  bool _startingProcess = false;
  bool _wsConnected = false;
  String _status = 'Idle';
  String _lastError = '';

  @override
  void dispose() {
    _shutdownAll();
    _flushTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _shutdownAll() async {
    await _closeWebSocket(sendExit: true);
    await _stopKeyMonitor();
  }

  Future<void> _startKeyMonitor() async {
    if (_keyMonitorProcess != null) {
      return;
    }
    setState(() {
      _startingProcess = true;
      _status = 'Starting keyMonitor.exe...';
      _lastError = '';
    });
    try {
      final String exePath =
          '${Directory.current.path}\\plugins\\keyMonitor.exe';
      _keyMonitorProcess = await Process.start(exePath, const [
        '-m',
        'ws',
        '-p',
        '7098',
      ], runInShell: true);
      _stdoutSub = _keyMonitorProcess!.stdout.listen(
        (_) {},
        onError: (_) {},
        cancelOnError: true,
      );
      _stderrSub = _keyMonitorProcess!.stderr.listen(
        (_) {},
        onError: (_) {},
        cancelOnError: true,
      );
      _keyMonitorProcess!.exitCode.then((code) {
        if (!mounted) return;
        setState(() {
          _keyMonitorProcess = null;
          _stdoutSub?.cancel();
          _stderrSub?.cancel();
          _stdoutSub = null;
          _stderrSub = null;
          _status = 'keyMonitor.exe exited ($code)';
        });
      });
      setState(() {
        _status = 'keyMonitor.exe running';
      });
    } catch (e) {
      setState(() {
        _lastError = 'Failed to start keyMonitor.exe: $e';
        _status = 'Start failed';
      });
    } finally {
      if (mounted) {
        setState(() {
          _startingProcess = false;
        });
      }
    }
  }

  Future<void> _stopKeyMonitor() async {
    if (_keyMonitorProcess == null) {
      return;
    }
    final Process process = _keyMonitorProcess!;
    _keyMonitorProcess = null;
    await _stdoutSub?.cancel();
    await _stderrSub?.cancel();
    _stdoutSub = null;
    _stderrSub = null;
    process.kill(ProcessSignal.sigterm);
    await Future<void>.delayed(const Duration(milliseconds: 200));
    process.kill(ProcessSignal.sigkill);
    if (mounted) {
      setState(() {
        _status = 'keyMonitor.exe stopped';
      });
    }
  }

  Future<void> _connectWs() async {
    if (_wsConnected || _connecting) {
      return;
    }

    _clearLogs();

    setState(() {
      _connecting = true;
      _status = 'Connecting ws://127.0.0.1:7098...';
      _lastError = '';
    });

    try {
      _ws = await WebSocket.connect('ws://127.0.0.1:7098');
      _wsConnected = true;
      _wsUptime?.stop();
      _wsUptime = Stopwatch()..start();
      _ws!.add('start');
      _wsSubscription = _ws!.listen(
        (dynamic data) {
          final String message = data.toString();
          final List<String> lines = message.split('\n');
          final List<String> formatted = <String>[];
          for (final String line in lines) {
            formatted.add(_applyTimestampIfNeeded(line));
          }
          _appendLogs(formatted);
        },
        onError: (Object err) {
          if (!mounted) return;
          setState(() {
            _lastError = 'WS error: $err';
            _status = 'WS error';
            _wsConnected = false;
          });
        },
        onDone: () {
          if (!mounted) return;
          setState(() {
            _status = 'WS closed';
            _wsConnected = false;
          });
        },
        cancelOnError: true,
      );
      if (mounted) {
        setState(() {
          _status = 'WS connected';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _lastError = 'Failed to connect WS: $e';
          _status = 'WS connect failed';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _connecting = false;
        });
      }
    }
  }

  Future<void> _closeWebSocket({required bool sendExit}) async {
    if (_ws == null) {
      return;
    }
    final WebSocket ws = _ws!;
    _ws = null;
    try {
      if (sendExit) {
        ws.add('exit');
      }
      await ws.close();
    } catch (_) {}
    await _wsSubscription?.cancel();
    _wsSubscription = null;
    _wsUptime?.stop();
    _wsUptime = null;
    if (mounted) {
      setState(() {
        _wsConnected = false;
        _status = 'WS closed';
      });
    }
  }

  void _clearLogs() {
    wsMessageStore.clear();
    _logs.clear();
    _pendingLogs.clear();
    _flushTimer?.cancel();
    _flushTimer = null;
  }

  String _applyTimestampIfNeeded(String line) {
    if (line.isEmpty || line.codeUnitAt(0) != 0x5B) {
      return line;
    }
    final int closeIndex = line.indexOf(']');
    if (closeIndex <= 1) {
      return line;
    }
    for (int i = 1; i < closeIndex; i++) {
      final int code = line.codeUnitAt(i);
      if (code < 0x30 || code > 0x39) {
        return line;
      }
    }
    final Stopwatch? uptime = _wsUptime;
    if (uptime == null) {
      return line;
    }
    final Duration elapsed = uptime.elapsed;
    final String hh = elapsed.inHours.toString().padLeft(2, '0');
    final String mm = (elapsed.inMinutes % 60).toString().padLeft(2, '0');
    final String ss = (elapsed.inSeconds % 60).toString().padLeft(2, '0');
    return '[$hh:$mm:$ss]${line.substring(closeIndex + 1)}';
  }

  void _appendLogs(List<String> messages) {
    if (messages.isEmpty) return;
    wsMessageStore.addAll(messages);
    if (wsMessageStore.length > _maxLogs) {
      wsMessageStore.removeRange(0, wsMessageStore.length - _maxLogs);
    }
    _pendingLogs.addAll(messages);
    _flushTimer ??= Timer(_flushInterval, _flushPendingLogs);
  }

  void _flushPendingLogs() {
    _flushTimer = null;
    if (!mounted || _pendingLogs.isEmpty) return;
    _logs.addAll(_pendingLogs);
    _pendingLogs.clear();
    if (_logs.length > _maxLogs) {
      _logs.removeRange(0, _logs.length - _maxLogs);
    }
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
    });
  }

  Future<void> _handleConnect() async {
    await _startKeyMonitor();
    await _connectWs();
  }

  Future<void> _handleStop() async {
    await _closeWebSocket(sendExit: true);
    await _stopKeyMonitor();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('KeyMonitor WS')),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: <Widget>[
            Row(
              children: <Widget>[
                ElevatedButton(
                  onPressed: _startingProcess || _connecting
                      ? null
                      : _handleConnect,
                  child: const Text('Connect'),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: _handleStop,
                  child: const Text('Stop'),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Status: $_status',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: <Widget>[
                Text('WS: ${_wsConnected ? 'Connected' : 'Disconnected'}'),
                const SizedBox(width: 16),
                Text(
                  'Process: ${_keyMonitorProcess != null ? 'Running' : 'Stopped'}',
                ),
              ],
            ),
            if (_lastError.isNotEmpty) ...<Widget>[
              const SizedBox(height: 6),
              Text(_lastError, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 12),
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade400),
                ),
                child: SelectionArea(
                  child: Scrollbar(
                    controller: _scrollController,
                    child: SingleChildScrollView(
                      controller: _scrollController,
                      child: SelectableText(
                        _logs.join('\n'),
                        style: const TextStyle(fontFamily: 'monospace'),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
