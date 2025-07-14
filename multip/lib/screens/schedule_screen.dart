import 'package:flutter/material.dart';

/// 任务计划表页面
class ScheduleScreen extends StatelessWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black54,
      child: Column(children: [ScheduleBar()]),
    );
  }
}

class ScheduleBar extends StatelessWidget {
  const ScheduleBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            margin: EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            color: Colors.black38,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text.rich(TextSpan(
                  style: TextStyle(color: Colors.white),
                  children: [
                    TextSpan(text: '共'),
                    TextSpan(text: ' - ',style: TextStyle(color: Colors.orangeAccent)),
                    TextSpan(text: '项任务，'),
                    TextSpan(text: ' - ',style: TextStyle(color: Colors.deepOrange)),
                    TextSpan(text: '项任务正在执行中'),
                  ]
                )),
                FilledButton(
                  style: FilledButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(0),
                    ),
                    backgroundColor: Colors.black45,
                  ),
                  onPressed: () {},
                  child: Row(
                    children: [
                      Text(
                        '添加任务',
                        style: TextStyle(fontSize: 16, letterSpacing: 1),
                      ),
                      SizedBox(width: 6),
                      Icon(Icons.add),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
