// CMD的类型
class CmdO {
  final String id;
  final bool deleteAble;
  final String name;
  final String winCmd;
  final String macCmd;
  final String linuxCmd;

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
  final int delay;
  final int period;

  TimerO({
    required this.name,
    required this.bindCmd,
    required this.bindRecord,
    required this.tiptext,
    required this.delay,
    required this.period,
  });

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

  ScheduleMap({
    required this.cmds,
    required this.records,
    required this.times,
  });

  factory ScheduleMap.fromJson(Map<String, dynamic> json) {
    return ScheduleMap(
      cmds: (json['cmds'] as List).map((i) => CmdO.fromJson(i)).toList(),
      records: json['records'],
      times: (json['times'] as List).map((i) => TimerO.fromJson(i)).toList(),
    );
  }
}