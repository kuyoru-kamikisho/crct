import 'package:flutter/material.dart';

import 'services/app_controller.dart';
import 'pages/shell_page.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final app = AppController();
  await app.init();
  runApp(KacherApp(app: app));
}

class KacherApp extends StatelessWidget {
  const KacherApp({required this.app, super.key});

  final AppController app;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kacher',
      debugShowCheckedModeBanner: false,
      theme: buildKacherTheme(),
      navigatorKey: app.navigatorKey,
      home: ShellPage(app: app),
    );
  }
}
