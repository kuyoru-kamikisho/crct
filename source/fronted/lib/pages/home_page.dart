import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../store/auth_store.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthStore>();
    return Scaffold(
      appBar: AppBar(title: const Text('首页')),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(auth.loggedIn ? '当前用户：${auth.user?['username'] ?? ''}' : '未登录，去登录'),
          const SizedBox(height: 16),
          Container(height: 120, margin: const EdgeInsets.all(16), color: const Color.fromARGB(255, 30, 22, 31)),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextButton(
                onPressed: () => Navigator.pushNamed(context, '/login'),
                child: const Text('去登录'),
              ),
              TextButton(
                onPressed: () => Navigator.pushNamed(context, '/register'),
                child: const Text('去注册'),
              ),
              if (auth.loggedIn)
                TextButton(
                  onPressed: () async => auth.clearSession(),
                  child: const Text('退出'),
                ),
            ],
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
