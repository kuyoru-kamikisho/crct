import 'dart:async';
import 'dart:isolate';
import 'package:bitsdojo_window/bitsdojo_window.dart';
import 'package:flutter/material.dart';
import 'package:flutter_acrylic/window.dart';
import 'package:flutter_acrylic/window_effect.dart';
import 'package:multip/tools/dmc.dart';
import 'package:multip/tools/ip_time.dart';
import 'package:multip/declares/schedule_o.dart';

/// 全局存储
class MyAppState extends ChangeNotifier {
  // ----------------------------------[变量区]----------------------------------
  // ----------------------------------全局用----------------------------------
  double appScreenWidth = 320;
  double appScreenHeight = 720;
  double appLeftToScreenLeft = 0;
  double appTopToScreenTop = 0;
  bool appCollapsed = false;
  bool appStayToped = false;

  // ----------------------------------任务表用----------------------------------
  int runningScheduleNum = 0;
  ScheduleMap? scheduleMap;

  // ----------------------------------首页用----------------------------------
  Timer? _timer;
  String hour = '12';
  String minute = '00';
  String weekJp = '';
  String weekEn = '';
  String month = '';
  String date = '';
  IpInfoO? ipInfo;
  // 每隔一段时间重新查询天气
  Timer? _timerW;
  WeatherO? weather;

  // ----------------------------------设备性能变量区----------------------------------
  final ReceivePort _receivePort = ReceivePort();
  bool _isWatchingDevicePerformance = false;
  double _cpu = 0;
  double _dsk = 0;
  double _mem = 0;
  int _btt = 0;

  double get cpu => _cpu;
  double get disk => _dsk;
  double get memory => _mem;
  int get battery => _btt;

  // ----------------------------------[函数区]----------------------------------
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
      weekJp = getJpWeekDay(now.weekday);
      weekEn = getEnWeekDay(now.weekday);
      month = padZero(now.month);
      date = padZero(now.day);
      notifyListeners();
    });
  }

  void checkIpAndWeather() async {
    queryMyIp().then((o) {
      if (o != null) {
        ipInfo = o;
        notifyListeners();
        checkWeather();
      }
    });
  }

  void checkWeather() async {
    if (_timerW != null) return;
    _fetchWeather();
    _timerW = Timer.periodic(const Duration(minutes: 5), (_) {
      _fetchWeather();
    });
  }

  void _fetchWeather() {
    if (ipInfo != null) {
      print('开始获取天气');
      queryWeather(
        latitude: ipInfo!.latitude,
        longitude: ipInfo!.longitude,
      ).then((o) {
        weather = o;
        notifyListeners();
        print('已获取到天气');
      });
    }
  }

  Future<void> watchDevicePerformance() async {
    if (_isWatchingDevicePerformance) {
      return;
    }
    _isWatchingDevicePerformance = true;
    _receivePort.listen((d) {
      if (d is Map<String, dynamic>) {
        _cpu = double.parse(d['c']!.toStringAsFixed(2));
        _dsk = double.parse(d['d']!.toStringAsFixed(2));
        _mem = double.parse(d['m']!.toStringAsFixed(2));
        _btt = d['b'];
        notifyListeners();
      }
    });
    var dmc = DmcClass(mainPort1: _receivePort.sendPort);
    dmc.spawn();
  }

  void switchAppCollapse({bool? b}) {
    if (b != null) {
      appCollapsed = b;
      notifyListeners();
    } else {
      appCollapsed = !appCollapsed;
      notifyListeners();
    }
    if (appCollapsed) {
      var collapsedSize = Size(140, 30);
      appWindow.size = collapsedSize;
      appWindow.minSize = collapsedSize;
      appWindow.maxSize = collapsedSize;
      Window.setEffect(
        effect: WindowEffect.transparent,
        color: Colors.transparent,
        dark: false,
      );
    } else {
      var expandedSize = Size(800, 472);
      appWindow.maxSize = expandedSize;
      appWindow.minSize = expandedSize;
      appWindow.size = expandedSize;
      Window.setEffect(
        effect: WindowEffect.transparent,
        color: const Color.fromARGB(94, 189, 168, 230),
        dark: false,
      );
    }
    print('appCollapsed: $appCollapsed');
  }

  void recordTopState(bool b) {
    appStayToped = b;
    notifyListeners();
  }
}
