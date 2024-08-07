import 'package:crct/widgets/win_event.dart';
import 'package:flutter/material.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTextStyle.merge(
        style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.normal,
            color: Colors.black,
            decoration: TextDecoration.none),
        child: Stack(children: [
          Container(color: Colors.blueGrey),
          const WinEvent(),
        ]));
  }
}
