import 'package:crct/widgets/footer_bar.dart';
import 'package:crct/widgets/win_event.dart';
import 'package:flutter/material.dart';

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
        home: DefaultTextStyle.merge(
            style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.normal,
                color: Colors.black,
                decoration: TextDecoration.none),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                    child: Stack(children: [
                  Container(color: Colors.blueGrey),
                  const WinEvent(),
                ])),
                const FooterBar()
              ],
            )));
  }
}
