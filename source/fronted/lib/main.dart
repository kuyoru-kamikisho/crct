import 'package:flutter/material.dart';

import 'app.dart';
import 'store/auth_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final authStore = AuthStore();
  await authStore.init();
  runApp(MainApp(authStore: authStore));
}
