import 'dart:async';
import 'package:flutter/material.dart';
import 'package:multip/tools/ip_time.dart';
import 'package:multip/declares/schedule_o.dart';

/// 全局存储
class MyAppState extends ChangeNotifier {
  // 全局用
  double appScreenWidth = 320;
  double appScreenHeight = 720;

  // 任务表用
  int runningScheduleNum = 0;
  ScheduleMap? scheduleMap;

  // 首页用
  Timer? _timer;
  String hour = '12';
  String minute = '00';
  String week = '';
  String month = '';
  String date = '';

  void setScreenWidth(double n) {
    appScreenWidth = n;
    Future.microtask(() => notifyListeners());
  }

  void setScreenHeight(double n) {
    appScreenHeight = n;
    Future.microtask(() => notifyListeners());
  }

  void addASchedule() {
    runningScheduleNum++;
    notifyListeners();
  }

  void deleteASchedule() {
    runningScheduleNum--;
    notifyListeners();
  }

  void setScheduleMap(ScheduleMap o) {
    scheduleMap = o;
    notifyListeners();
  }

  void startTimeClock() async {
    if (_timer != null) return;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      var now = DateTime.now();
      hour = padZero(now.hour);
      minute = padZero(now.minute);
      week = getJpWeekDay(now.weekday);
      month = padZero(now.month);
      date = padZero(now.day);
      notifyListeners();
    });
  }
}
