import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../store/auth_store.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthStore>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('首页'),
        leading: IconButton(icon: Icon(Icons.menu), onPressed: () {}),
        actions: [
          Tooltip(
            message: auth.loggedIn ? '个人中心' : '登录/注册',
            child: IconButton(
              icon: Icon(Icons.account_circle),
              onPressed: () {
                if (auth.loggedIn) {
                  Navigator.pushNamed(context, '/profile_page');
                } else {
                  Navigator.pushNamed(context, '/login');
                }
              },
            ),
          ),
        ],
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            auth.loggedIn ? '当前用户：${auth.user?['username'] ?? ''}' : '未登录，去登录',
          ),
          const SizedBox(height: 16),
          Container(
            height: 120,
            margin: const EdgeInsets.all(16),
            color: const Color.fromARGB(255, 30, 22, 31),
          ),
          const Spacer(),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: []),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
