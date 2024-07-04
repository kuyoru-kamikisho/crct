import 'dart:async';
import 'package:crct/tools/leaf.dart';
import 'package:crct/widgets/style_text.dart';
import 'package:flutter/material.dart';

class TimeInfo extends StatefulWidget {
  const TimeInfo({super.key});

  @override
  State<TimeInfo> createState() => _TimeInfoState();
}

class _TimeInfoState extends State<TimeInfo> {
  Timer? _timer;
  String _year = '_';
  String _month = '_';
  String _day = '_';
  String _hour = '_';
  String _minute = '_';
  String _second = '_';
  String _week = '_';

  final TextStyle _style = dmcTextStyle();

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      DateTime now = DateTime.now();
      setState(() {
        _year = '${now.year}';
        _month = '${now.month}';
        _day = '${now.day}';
        _hour = padZero(now.hour);
        _minute = padZero(now.minute);
        _second = padZero(now.second);
        _week = jpWeekdays[now.weekday]!;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(
            '$_hour:$_minute:$_second',
            style: _style,
          ),
        ),
        Container(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              '$_year年$_month月$_day日 $_week',
              style: _style,
            )),
      ],
    );
  }
}
