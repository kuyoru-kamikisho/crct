import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthStore extends ChangeNotifier {
  String? token;
  Map<String, dynamic>? user;

  bool get loggedIn => token != null && token!.isNotEmpty;

  Future<void> init() async {
    final pref = await SharedPreferences.getInstance();
    token = pref.getString('token');
    final userJson = pref.getString('user');
    user = userJson == null ? null : jsonDecode(userJson) as Map<String, dynamic>;
    notifyListeners();
  }

  Future<void> saveSession(String newToken, Map<String, dynamic> newUser) async {
    token = newToken;
    user = newUser;
    final pref = await SharedPreferences.getInstance();
    await pref.setString('token', newToken);
    await pref.setString('user', jsonEncode(newUser));
    notifyListeners();
  }

  Future<void> clearSession() async {
    token = null;
    user = null;
    final pref = await SharedPreferences.getInstance();
    await pref.remove('token');
    await pref.remove('user');
    notifyListeners();
  }
}
