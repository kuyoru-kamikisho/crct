import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'pages/home_page.dart';
import 'pages/login_page.dart';
import 'pages/register_page.dart';
import 'pages/retrieve_page.dart';
import 'store/auth_store.dart';

class MainApp extends StatelessWidget {
  const MainApp({super.key, required this.authStore});
  final AuthStore authStore;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: authStore,
      child: MaterialApp(
        title: 'Auth Demo',
        themeMode: ThemeMode.dark,
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [
          Locale('zh', 'CN'),
          Locale('en', 'US'),
        ],
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          fontFamily: 'SourceHanSansCN',
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF39B8FF),
            secondary: Color(0xFF39B8FF),
            tertiary: Color(0xFF39B8FF),
            surface: Color(0xFF1B132B),
          ),
          scaffoldBackgroundColor: const Color(0xFF120C1D),
          canvasColor: const Color(0xFF120C1D),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF120C1D),
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          textTheme: const TextTheme(
            bodyLarge: TextStyle(color: Colors.white),
            bodyMedium: TextStyle(color: Colors.white),
            bodySmall: TextStyle(color: Color(0xCCFFFFFF)),
            titleLarge: TextStyle(color: Colors.white),
            titleMedium: TextStyle(color: Colors.white),
            titleSmall: TextStyle(color: Color(0xCCFFFFFF)),
            labelLarge: TextStyle(color: Colors.white),
            labelMedium: TextStyle(color: Color(0xCCFFFFFF)),
            labelSmall: TextStyle(color: Color(0xCCFFFFFF)),
          ),
          inputDecorationTheme: const InputDecorationTheme(
            labelStyle: TextStyle(color: Color(0xCCFFFFFF)),
            hintStyle: TextStyle(color: Color(0x99FFFFFF)),
            helperStyle: TextStyle(color: Color(0xCCFFFFFF)),
          ),
        ),
        routes: {
          '/': (context) => const HomePage(),
          '/login': (context) => const LoginPage(),
          '/register': (context) => const RegisterPage(),
          '/retrieve': (context) => const RetrievePage(),
        },
        initialRoute: '/',
      ),
    );
  }
}
