import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:multip/states/my_app_state.dart';

/// 主页
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color.fromARGB(160, 0, 0, 0),
      child: Align(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            NumClock(),
            Container(
              color: const Color.fromARGB(43, 255, 255, 255),
              width: 1,
              height: 408,
              margin: EdgeInsets.only(left: 32, right: 20),
            ),
            WeatherPanel(),
          ],
        ),
      ),
    );
  }

  @override
  void initState() {
    context.read<MyAppState>()
      ..startTimeClock()
      ..checkIpAndWeather();

    super.initState();
  }
}

class WeatherPanel extends StatelessWidget {
  const WeatherPanel({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<MyAppState>();
    final weather = state.weather;
    final ipInfo = state.ipInfo;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        NormalText(text: weather?.current.isDay == 1 ? '白天' : '黑夜'),
        NormalText(text: '天气：${weather?.weatherCn}'),
        NormalText(
          text:
              '温度：${weather?.current.temperature2m} ${weather?.currentUnits.temperature2m}',
        ),
        NormalText(
          text:
              '体感温度：${weather?.current.apparentTemperature} ${weather?.currentUnits.apparentTemperature}',
        ),
        NormalText(
          text:
              '相对湿度：${weather?.current.relativeHumidity2m} ${weather?.currentUnits.relativeHumidity2m}',
        ),
        NormalText(
          text: '降雨量：${weather?.current.rain} ${weather?.currentUnits.rain}',
        ),
        NormalText(
          text:
              '降雪量：${weather?.current.snowfall} ${weather?.currentUnits.snowfall}',
        ),
        NormalText(
          text:
              '风向：${weather?.current.windDirection10m} ${weather?.currentUnits.windDirection10m}',
        ),
        NormalText(
          text:
              '风速：${weather?.current.windSpeed10m} ${weather?.currentUnits.windSpeed10m}',
        ),
        NormalText(text: 'ip地址：${ipInfo?.ip}'),
        NormalText(text: '天气更新时间：${weather?.current.time}'),
      ],
    );
  }
}

class NormalText extends StatelessWidget {
  const NormalText({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 2),
          child: Text(
            text,
            style: TextStyle(
              color: Colors.white,
              fontFamily: 'PARaDOS',
              fontSize: 16,
            ),
          ),
        ),
      ],
    );
  }
}

class NumClock extends StatelessWidget {
  const NumClock({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<MyAppState>();

    final (month, date, weekEn, weekJp, hour, minute) = (
      state.month,
      state.date,
      state.weekEn,
      state.weekJp,
      state.hour,
      state.minute,
    );
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnalogClock(),
        SizedBox(height: 14),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ClockText(text: hour),
                ClockText(text: minute),
              ],
            ),
            SizedBox(width: 20),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(height: 40),
                Text(
                  '$weekJp $month月$date日',
                  style: TextStyle(
                    fontFamily: 'HYWenHei65w',
                    fontSize: 20,
                    letterSpacing: 1,
                    color: Colors.white,
                  ),
                ),
                Container(
                  color: Colors.white,
                  height: 1,
                  width: 178,
                  margin: EdgeInsets.only(top: 10),
                ),
                Text(
                  weekEn,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 48,
                    fontFamily: 'PARaDOS',
                    letterSpacing: 10,
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

class ClockText extends StatelessWidget {
  const ClockText({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      blendMode: BlendMode.srcIn,
      shaderCallback: (Rect bounds) {
        return LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color.fromARGB(255, 154, 154, 166),
            const Color.fromARGB(255, 255, 255, 255),
          ],
          stops: [0.58, 0.59],
        ).createShader(bounds);
      },
      child: Text(
        text,
        style: TextStyle(
          height: 1,
          fontSize: 72,
          fontFamily: 'PARaDOS',
          color: Colors.white,
        ),
      ),
    );
  }
}

class AnalogClock extends StatefulWidget {
  const AnalogClock({super.key});

  @override
  State<AnalogClock> createState() => _AnalogClockState();
}

class _AnalogClockState extends State<AnalogClock>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    // 每秒刷新（约60FPS）
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1), // 仅用于初始化，实际通过repeat持续运行
    )..repeat();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animationController,
      builder: (context, child) {
        final now = DateTime.now();
        return CustomPaint(
          painter: _ClockPainter(now),
          size: const Size.square(240), // 固定尺寸，可改为MediaQuery动态尺寸
        );
      },
    );
  }
}

class _ClockPainter extends CustomPainter {
  final DateTime currentTime;

  _ClockPainter(this.currentTime);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    final paint = Paint();

    // 1. 绘制表盘背景
    paint.color = Colors.transparent;
    canvas.drawCircle(center, radius, paint);

    // 2. 绘制60个刻度（长刻度+短刻度）
    paint.color = Colors.white;
    paint.strokeWidth = 1;
    for (var i = 0; i < 60; i++) {
      final angle = math.pi * 2 * i / 60;
      final isHourTick = i % 5 == 0; // 每5个刻度一个长刻度
      final tickLength = isHourTick ? 12 : 6;
      final tickStart = Offset(
        center.dx + (radius - tickLength - 5) * math.cos(angle),
        center.dy + (radius - tickLength - 5) * math.sin(angle),
      );
      final tickEnd = Offset(
        center.dx + (radius - 5) * math.cos(angle),
        center.dy + (radius - 5) * math.sin(angle),
      );
      canvas.drawLine(tickStart, tickEnd, paint);
    }

    // 3. 绘制时针（蓝色）
    final hourAngle =
        math.pi * 2 * (currentTime.hour % 12 + currentTime.minute / 60) / 12;
    drawHand(canvas, center, hourAngle, radius * 0.5, Colors.blue, 4);

    // 4. 绘制分针（绿色）
    final minuteAngle =
        math.pi * 2 * (currentTime.minute + currentTime.second / 60) / 60;
    drawHand(canvas, center, minuteAngle, radius * 0.7, Colors.green, 2);

    // 5. 绘制秒针（红色）
    final secondAngle = math.pi * 2 * currentTime.second / 60;
    drawHand(canvas, center, secondAngle, radius * 0.8, Colors.red, 1);
  }

  void drawHand(
    Canvas canvas,
    Offset center,
    double angle,
    double length,
    Color color,
    double width,
  ) {
    final end = Offset(
      center.dx + length * math.cos(angle - math.pi / 2), // -pi/2 使0角度指向12点
      center.dy + length * math.sin(angle - math.pi / 2),
    );
    final paint = Paint()
      ..color = color
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(center, end, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
