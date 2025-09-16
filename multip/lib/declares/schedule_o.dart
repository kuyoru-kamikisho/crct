import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:multip/extensions/collection.dart';

class CmdO {
  final String id;
  final bool deleteAble;
  final String name;
  final String? winCmd;
  final String? macCmd;
  final String? linuxCmd;

  // 使用 ValueNotifier 包装状态
  final ValueNotifier<bool> hovering = ValueNotifier(false);
  final ValueNotifier<bool> running = ValueNotifier(false);

  Process? _process;
  VoidCallback? onRun;
  VoidCallback? onStop;

  CmdO({
    required this.id,
    required this.deleteAble,
    required this.name,
    required this.winCmd,
    required this.macCmd,
    required this.linuxCmd,
  });

  String get cmdForCurrentPlatform {
    if (Platform.isWindows) return winCmd ?? '';
    if (Platform.isMacOS) return macCmd ?? '';
    if (Platform.isLinux) return linuxCmd ?? '';
    return '';
  }

  Future<void> run() async {
    final cmd = cmdForCurrentPlatform;
    if (cmd.isEmpty) return;

    // 如果已经在运行，先停止
    if (running.value) {
      await stop();
    }

    try {
      final parts = cmd.split(' ');
      final executable = parts.first;
      final arguments = parts.skip(1).toList();

      _process = await Process.start(executable, arguments, runInShell: true);

      running.value = true;
      onRun?.call();

      // 监听进程退出
      _process!.exitCode
          .then((code) {
            running.value = false;
            onStop?.call();
          })
          .catchError((e) {
            running.value = false;
            onStop?.call();
          });
    } catch (e) {
      print('启动失败: $e');
      running.value = false;
    }
  }

  Future<void> stop() async {
    if (_process != null && running.value) {
      try {
        _process!.kill();
        running.value = false;
        onStop?.call();
      } catch (e) {
        print('停止失败: $e');
      }
    }
  }

  // 设置悬停状态
  void setHovering(bool value) {
    hovering.value = value;
  }

  // 清理资源
  void dispose() {
    _process?.kill();
    hovering.dispose();
    running.dispose();
  }

  factory CmdO.fromJson(Map<String, dynamic> json) {
    return CmdO(
      id: json['id'],
      deleteAble: json['deleteAble'],
      name: json['name'],
      winCmd: json['winCmd'],
      macCmd: json['macCmd'],
      linuxCmd: json['linuxCmd'],
    );
  }
}

// 定时任务的类型
class TimerO {
  final String name;
  final String bindCmd;
  final String bindRecord;
  final String tiptext;
  final int delay;
  final int period;

  Timer? _timer;

  final ValueNotifier<bool> running = ValueNotifier(false);
  final ValueNotifier<bool> hovering = ValueNotifier(false);
  final ValueNotifier<int> startTime = ValueNotifier(0);
  final ValueNotifier<int> currentTime = ValueNotifier(0);
  final ValueNotifier<double> progress = ValueNotifier(0.0);

  VoidCallback? onRun;
  VoidCallback? onStop;
  VoidCallback? onTimeReached;

  TimerO({
    required this.name,
    required this.bindCmd,
    required this.bindRecord,
    required this.tiptext,
    required this.delay,
    required this.period,
  });

  void run() {
    if (running.value) return;

    running.value = true;
    startTime.value = DateTime.now().millisecondsSinceEpoch;
    currentTime.value = startTime.value;
    progress.value = 0.0;

    onRun?.call();

    _timer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      currentTime.value = DateTime.now().millisecondsSinceEpoch;
      final elapsedSeconds = (currentTime.value - startTime.value) / 1000;

      progress.value = (elapsedSeconds / delay).clamp(0.0, 1.0);

      if (progress.value >= 1.0) {
        onTimeReached?.call();
        stop();
      }
    });
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    running.value = false;
    startTime.value = 0;
    currentTime.value = 0;
    progress.value = 0.0;
    onStop?.call();
  }

  void dispose() {
    _timer?.cancel();
    running.dispose();
    hovering.dispose();
    startTime.dispose();
    currentTime.dispose();
    progress.dispose();
    print('data disposed.');
  }

  factory TimerO.fromJson(Map<String, dynamic> json) {
    return TimerO(
      name: json['name'],
      bindCmd: json['bindCmd'],
      bindRecord: json['bindRecord'],
      tiptext: json['tiptext'],
      delay: json['delay'],
      period: json['period'],
    );
  }
}

// 整个计划清单的类型
class ScheduleMap {
  final List<CmdO> cmds;
  final List<dynamic> records;
  final List<TimerO> times;

  ScheduleMap({required this.cmds, required this.records, required this.times});

  CmdO? findCmdById(String id) {
    return cmds.find((cmd) => cmd.id == id);
  }

  factory ScheduleMap.fromJson(Map<String, dynamic> json) {
    return ScheduleMap(
      cmds: (json['cmds'] as List).map((i) => CmdO.fromJson(i)).toList(),
      records: json['records'],
      times: (json['times'] as List).map((i) => TimerO.fromJson(i)).toList(),
    );
  }
}
