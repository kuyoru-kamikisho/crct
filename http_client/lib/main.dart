import 'package:flutter/material.dart';

import 'state/app_controller.dart';
import 'theme/app_theme.dart';
import 'widgets/home_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final controller = AppController();
  await controller.init();
  runApp(HttpClientApp(controller: controller));
}

class HttpClientApp extends StatelessWidget {
  const HttpClientApp({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final dark = controller.settings.darkTheme;
        return MaterialApp(
          title: 'HTTP Client',
          debugShowCheckedModeBanner: false,
          theme: buildAppTheme(dark: false),
          darkTheme: buildAppTheme(dark: true),
          themeMode: dark ? ThemeMode.dark : ThemeMode.light,
          home: HomePage(controller: controller),
        );
      },
    );
  }
}
