import 'package:crct/widgets/dmc_info.dart';
import 'package:crct/widgets/time_info.dart';
import 'package:flutter/material.dart';

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Column(
        children: [TimeInfo(), DmcInfo()],
      ),
    );
  }
}
