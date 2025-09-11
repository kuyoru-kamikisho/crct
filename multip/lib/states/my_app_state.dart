import 'dart:async';
import 'dart:isolate';
import 'package:flutter/material.dart';
import 'package:multip/tools/dmc.dart';
import 'package:multip/tools/ip_time.dart';
import 'package:multip/declares/schedule_o.dart';

/// 全局存储
class MyAppState extends ChangeNotifier {
  
  // ----------------------------------[变量区]----------------------------------
  // ----------------------------------全局用----------------------------------
  double appScreenWidth = 320;
  double appScreenHeight = 720;

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

  // ----------------------------------设备基础参数----------------------------------
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
}
