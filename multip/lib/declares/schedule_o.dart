import 'dart:ui';
import 'dart:async';

// CMD的类型
class CmdO {
  final String id;
  final bool deleteAble;
  final String name;
  final String winCmd;
  final String macCmd;
  final String linuxCmd;
  bool hovering = false;
  bool running = false;

  CmdO({
    required this.id,
    required this.deleteAble,
    required this.name,
    required this.winCmd,
    required this.macCmd,
    required this.linuxCmd,
  });

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
  // 等待时间，等待结束后立即执行
  final int delay;

  Timer? _timer;
  bool running = false;
  bool hovering = false;
  VoidCallback? onStateChanged;
  VoidCallback? onStop;
  VoidCallback? onRun;

  // 持续时间，持续时间到后强制结束：秒
  final int period;
  // 启动时间：毫秒
  int startTime = 0;
  // 当前进行到的时间：毫秒
  int currentTime = 0;
  // 当前执行进度 0 ~ 1
  double progress = 0.0;

  TimerO({
    required this.name,
    required this.bindCmd,
    required this.bindRecord,
    required this.tiptext,
    required this.delay,
    required this.period,
  });

  void run(VoidCallback? notifier) {
    if (running) return;
    if (notifier != null) onStateChanged = notifier;

    running = true;
    startTime = DateTime.now().millisecondsSinceEpoch;
    currentTime = startTime;
    progress = 0.0;

    if (onRun != null) {
      onRun!();
    }

    _notify();

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      currentTime = DateTime.now().millisecondsSinceEpoch;
      final elapsedSeconds = (currentTime - startTime) / 1000;

      progress = (elapsedSeconds / delay).clamp(0.0, 1.0);
      _notify();

      if (progress >= 1.0) {
        stop();
      }
    });
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    running = false;
    startTime = 0;
    currentTime = 0;
    progress = 0.0;
    _notify();
    if (onStop != null) {
      onStop!();
    }
  }

  void _notify() {
    onStateChanged?.call();
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

  factory ScheduleMap.fromJson(Map<String, dynamic> json) {
    return ScheduleMap(
      cmds: (json['cmds'] as List).map((i) => CmdO.fromJson(i)).toList(),
      records: json['records'],
      times: (json['times'] as List).map((i) => TimerO.fromJson(i)).toList(),
    );
  }
}
