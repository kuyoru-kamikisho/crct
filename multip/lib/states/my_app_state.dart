import 'package:flutter/material.dart';
import 'package:multip/declares/schedule_o.dart';

/// 全局存储
class MyAppState extends ChangeNotifier {
  double appScreenWidth = 320;
  double appScreenHeight = 720;
  int runningScheduleNum = 0;
  ScheduleMap? scheduleMap;

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
}
