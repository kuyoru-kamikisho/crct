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
      color: Colors.black54,
      child: Align(child: NumClock()),
    );
  }

  @override
  void initState() {
    context.read<MyAppState>().startTimeClock();
    super.initState();
  }
}

class NumClock extends StatelessWidget {
  const NumClock({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<MyAppState>();

    final (month, date, week, hour, minute) = (
      state.month,
      state.date,
      state.week,
      state.hour,
      state.minute,
    );
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        ClockText(text: hour),
        ClockText(text: minute),
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
