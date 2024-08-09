import 'package:crct/router/index.dart';
import 'package:crct/store/use_app.dart';
import 'package:crct/store/use_win.dart';
import 'package:crct/widgets/footer_bar.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await windowManager.ensureInitialized();

  WindowOptions windowOptions = const WindowOptions(
    size: Size(800, 600),
    center: true,
    backgroundColor: Color.fromARGB(223, 49, 48, 49),
    skipTaskbar: false,
    titleBarStyle: TitleBarStyle.normal,
    windowButtonVisibility: false,
  );
  windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.show();
    await windowManager.focus();
  });

  runApp(MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) {
        var appStore = UseApp();
        appStore.watchDevicePerformance();
        return appStore;
      }),
      ChangeNotifierProvider(create: (_) => UseWin())
    ],
    child: MaterialApp.router(
        routerConfig: appRouter,
        builder: (context, child) {
          return Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: child ?? const SizedBox.shrink()),
                const FooterBar()
              ]);
        }),
  ));
}
