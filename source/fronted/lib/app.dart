import 'package:flutter/material.dart';
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
