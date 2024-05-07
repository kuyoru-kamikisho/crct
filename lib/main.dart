import 'package:feriea/public_states.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';
import 'my_home_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await windowManager.ensureInitialized();

  WindowOptions windowOptions = const WindowOptions(
      size: Size(800, 600),
      center: true,
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      titleBarStyle: TitleBarStyle.normal,
      windowButtonVisibility: false,
      minimumSize: Size(338, 546));
  windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.show();
    await windowManager.focus();
  });
  runApp(MultiProvider(providers: [
    ChangeNotifierProvider(create: (_) {
      var uc = UseCurrency();
      uc.queryRates();
      return uc;
    })
  ], child: const MyApp()));
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
