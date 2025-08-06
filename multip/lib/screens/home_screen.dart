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
    return Container(color: Colors.black54, child: NumClock());
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
    return Container(child: Column(
      children: [
        Text(hour,style: TextStyle(color: Colors.white,fontSize: 72,fontFamily: 'PARaDOS'),)
      ],
    ));
  }
}
