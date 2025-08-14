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
import 'package:multip/widgets/k_navigator.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Window.initialize();

  runApp(MyApp());

  if (Platform.isWindows) {
    await Window.hideWindowControls();
    doWhenWindowReady(() async {
      const initialSize = Size(800, 472);
      appWindow.minSize = initialSize;
      appWindow.size = initialSize;
      appWindow.alignment = Alignment.center;
      appWindow.show();

      await Window.setEffect(
        effect: WindowEffect.aero,
        color: Colors.transparent,
      );
    });
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => MyAppState(),
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
                          body: Row(
                            children: [
                              KNavigator(constraints: constraints),
                              Expanded(child: routeWidget),
                            ],
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
