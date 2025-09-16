import 'dart:io';
import 'package:bitsdojo_window/bitsdojo_window.dart';
import 'package:flutter/material.dart';
import 'package:flutter_acrylic/window.dart';
import 'package:flutter_acrylic/window_effect.dart';
import 'package:multip/screens/guild_screen.dart';
import 'package:multip/screens/home_screen.dart';
import 'package:multip/screens/schedule_screen.dart';
import 'package:multip/screens/settings_screen.dart';
import 'package:multip/screens/site_screen.dart';
import 'package:multip/screens/word_flashcards.dart';
import 'package:multip/states/my_app_state.dart';
import 'package:multip/tools/ip_time.dart';
import 'package:multip/tools/window_shadow.dart';
import 'package:multip/widgets/k_navigator.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Window.initialize();

  if (Platform.isWindows) {
    await Window.hideWindowControls();
    doWhenWindowReady(() async {
      const initialSize = Size(800, 472);
      appWindow.minSize = initialSize;
      appWindow.maxSize = initialSize;
      appWindow.size = initialSize;
      appWindow.alignment = Alignment.center;
      Window.disableShadow();
      removeWindows11RoundedCorners();
      await Window.setEffect(
        effect: WindowEffect.transparent,
        color: const Color.fromARGB(94, 189, 168, 230),
        dark: false,
      );
    });
  }
  appWindow.show();

  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) {
        var appstate = MyAppState();
        appstate.watchDevicePerformance();
        return appstate;
      },
      child: MaterialApp.router(
        theme: ThemeData(
          fontFamily: 'HYWenHei85w',
          textTheme: TextTheme(labelSmall: TextStyle(fontSize: 16)),
        ),
        routerConfig: GoRouter(
          initialLocation: '/',
          routes: <RouteBase>[
            ShellRoute(
              builder:
                  (
                    BuildContext context,
                    GoRouterState state,
                    Widget routeWidget,
                  ) {
                    return LayoutBuilder(
                      builder: (context, constraints) {
                        context.read<MyAppState>().setScreenWidth(
                          constraints.maxWidth,
                        );
                        context.read<MyAppState>().setScreenHeight(
                          constraints.maxHeight,
                        );
                        return Scaffold(
                          backgroundColor: Colors.transparent,
                          body: AppOutestLayout(
                            routeWidget: routeWidget,
                            constraints: constraints,
                          ),
                        );
                      },
                    );
                  },
              routes: <RouteBase>[
                GoRoute(
                  path: '/',
                  builder: (BuildContext context, GoRouterState state) {
                    return HomeScreen();
                  },
                  routes: <RouteBase>[
                    GoRoute(
                      path: 'settings',
                      builder: (BuildContext context, GoRouterState state) {
                        return SettingsScreen();
                      },
                    ),
                    GoRoute(
                      path: 'websites',
                      builder: (BuildContext context, GoRouterState state) {
                        return SiteScreen();
                      },
                    ),
                    GoRoute(
                      path: 'schedule',
                      builder: (BuildContext context, GoRouterState state) {
                        return ScheduleScreen();
                      },
                    ),
                    GoRoute(
                      path: 'guild',
                      builder: (BuildContext context, GoRouterState state) {
                        return GuildScreen();
                      },
                    ),
                    GoRoute(
                      path: 'wordFlashcards',
                      builder: (BuildContext context, GoRouterState state) {
                        return WordFlashcards();
                      },
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class AppOutestLayout extends StatelessWidget {
  const AppOutestLayout({
    super.key,
    required this.routeWidget,
    required this.constraints,
  });
  final Widget routeWidget;
  final BoxConstraints constraints;

  @override
  Widget build(BuildContext context) {
    var appState = context.watch<MyAppState>();
    var appCollapsed = appState.appCollapsed;
    return Column(
      children: [
        AppTitleBar(),
        if (!appCollapsed)
          Expanded(
            child: Row(
              children: [
                KNavigator(constraints: constraints),
                Expanded(child: routeWidget),
              ],
            ),
          ),
      ],
    );
  }
}

class AppTitleBar extends StatelessWidget {
  const AppTitleBar({super.key});

  @override
  Widget build(BuildContext context) {
    var appState = context.watch<MyAppState>();
    var cpu = appState.cpu;
    var memory = appState.memory;
    var appCollapsed = appState.appCollapsed;

    return Container(
      height: 32,
      decoration: BoxDecoration(
        color: Colors.black54,
        border: BoxBorder.fromLTRB(
          bottom: BorderSide(color: const Color.fromARGB(103, 39, 38, 39)),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onPanStart: (details) {
                appWindow.startDragging();
              },
              child: Padding(
                padding: const EdgeInsetsGeometry.only(left: 12, right: 0),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () {
                        appState.switchAppCollapse();
                      },
                      child: MouseRegion(
                        cursor: SystemMouseCursors.click,
                        child: Text(
                          'Ktop',
                          style: TextStyle(
                            color: Colors.white,
                            fontFamily: 'PARaDOS',
                          ),
                        ),
                      ),
                    ),
                    Container(
                      margin: EdgeInsets.symmetric(horizontal: 8),
                      width: 1,
                      height: 16,
                      color: const Color.fromARGB(40, 255, 255, 255),
                    ),
                    Text(
                      padZero(cpu.toInt()),
                      style: TextStyle(
                        color: dmcColor(cpu),
                        fontFamily: 'PARaDOS',
                      ),
                    ),
                    Container(
                      margin: EdgeInsets.symmetric(horizontal: 8),
                      width: 1,
                      height: 16,
                      color: const Color.fromARGB(40, 255, 255, 255),
                    ),
                    Text(
                      padZero(memory.toInt()),
                      style: TextStyle(
                        color: dmcColor(memory),
                        fontFamily: 'PARaDOS',
                      ),
                    ),
                    Expanded(child: SizedBox()),
                    if (!appCollapsed)
                      CloseWindowButton(
                        colors: WindowButtonColors(iconNormal: Colors.white),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

Color dmcColor(double num) {
  if (num < 25) return const Color.fromARGB(255, 29, 147, 243);
  if (num < 50) return const Color.fromARGB(255, 22, 238, 69);
  if (num < 75) return const Color.fromARGB(255, 240, 163, 21);
  return const Color.fromARGB(255, 237, 252, 27);
}
