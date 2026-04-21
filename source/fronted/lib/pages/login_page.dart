import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api_client.dart';
import '../store/auth_store.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _api = ApiClient();
  final _formKey = GlobalKey<FormState>();
  String _username = '';
  String _password = '';
  bool _loading = false;
  int _countdown = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.read<AuthStore>();
    if (auth.loggedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) => Navigator.pushReplacementNamed(context, '/'));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _loading || _countdown > 0) {
      return;
    }
    _formKey.currentState!.save();
    setState(() => _loading = true);
    final result = await _api.post('/login', {
      'username': _username,
      'password': _password,
      'ipAddress': '127.0.0.1',
    });
    if (!mounted) {
      return;
    }
    setState(() => _loading = false);
    if (result['code'] == 200) {
      final data = result['data'] as Map<String, dynamic>;
      await context.read<AuthStore>().saveSession(data['token'] as String, data['user'] as Map<String, dynamic>);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('登录成功')));
      Navigator.pushReplacementNamed(context, '/');
      return;
    }
    setState(() => _countdown = 60);
    _tickCountdown();
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${result['msg']}')));
  }

  void _tickCountdown() async {
    while (mounted && _countdown > 0) {
      await Future<void>.delayed(const Duration(seconds: 1));
      if (!mounted) {
        return;
      }
      setState(() => _countdown -= 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    final disabled = _loading || _countdown > 0;
    return Scaffold(
      appBar: AppBar(title: const Text('登录')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                decoration: const InputDecoration(labelText: '用户名'),
                validator: (v) => v == null || v.trim().isEmpty ? '用户名不能为空' : null,
                onSaved: (v) => _username = v!.trim(),
              ),
              TextFormField(
                decoration: const InputDecoration(labelText: '密码'),
                obscureText: true,
                validator: (v) => v == null || v.isEmpty ? '密码不能为空' : null,
                onSaved: (v) => _password = v!,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: disabled ? null : _submit,
                child: Text(disabled && _countdown > 0 ? '$_countdown 秒后可登录' : (_loading ? '登录中...' : '登录')),
              ),
              TextButton(onPressed: () => Navigator.pushReplacementNamed(context, '/register'), child: const Text('还没有账号？去注册')),
              TextButton(onPressed: () => Navigator.pushNamed(context, '/retrieve'), child: const Text('忘记密码或用户名')),
            ],
          ),
        ),
      ),
    );
  }
}
