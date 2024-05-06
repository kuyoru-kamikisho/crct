import 'package:flutter/material.dart';
import 'my_home_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '汇率计算器',
      theme: ThemeData(
        fontFamily: 'HYWenHei-65W',
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.grey[850]!),
        useMaterial3: true,
      ),
      home: const MyHomePage(
        title: '汇率计算器',
      ),
    );
  }
}
