import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../utils/recovery_key.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _api = ApiClient();
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _recoveryKeyController;
  String _username = '';
  String _password = '';
  int _gender = 2;
  DateTime? _birthday;
  String _recoveryKey = randomRecoveryKey();
  bool _loading = false;
  int _countdown = 0;
  bool _usernameAvailable = false;

  @override
  void initState() {
    super.initState();
    _recoveryKeyController = TextEditingController(text: _recoveryKey);
  }

  @override
  void dispose() {
    _recoveryKeyController.dispose();
    super.dispose();
  }

  Future<void> _checkUsername(String value) async {
    if (value.trim().isEmpty) {
      setState(() => _usernameAvailable = false);
      return;
    }
    final result = await _api.get('/check-username?username=${Uri.encodeComponent(value.trim())}');
    if (!mounted) {
      return;
    }
    final data = result['data'] as Map<String, dynamic>?;
    setState(() => _usernameAvailable = (data?['available'] ?? false) as bool);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _loading || _countdown > 0 || !_usernameAvailable) {
      return;
    }
    _formKey.currentState!.save();
    setState(() => _loading = true);
    final result = await _api.post('/register', {
      'username': _username,
      'password': _password,
      'gender': _gender,
      'birthday': _birthday?.toIso8601String().substring(0, 10),
      'recoveryKey': _recoveryKey,
      'ipAddress': '127.0.0.1',
    });
    if (!mounted) {
      return;
    }
    setState(() => _loading = false);
    if (result['code'] == 200) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('注册成功，3秒后跳转登录')));
      _formKey.currentState!.reset();
      setState(() {
        _recoveryKey = randomRecoveryKey();
        _recoveryKeyController.text = _recoveryKey;
        _usernameAvailable = false;
        _countdown = 10;
      });
      _tickCountdown();
      Future<void>.delayed(const Duration(seconds: 3), () {
        if (mounted) {
          Navigator.pushReplacementNamed(context, '/login');
        }
      });
      return;
    }
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
    final disabled = _loading || _countdown > 0 || !_usernameAvailable;
    final birthdayText = _birthday == null
        ? '请选择生日（可选）'
        : '${_birthday!.year.toString().padLeft(4, '0')}-${_birthday!.month.toString().padLeft(2, '0')}-${_birthday!.day.toString().padLeft(2, '0')}';
    return Scaffold(
      appBar: AppBar(title: const Text('注册')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                decoration: InputDecoration(labelText: '用户名', helperText: _usernameAvailable ? '用户名可用' : '用户名不可用'),
                validator: (v) => v == null || v.trim().isEmpty ? '用户名不能为空' : null,
                onChanged: _checkUsername,
                onSaved: (v) => _username = v!.trim(),
              ),
              TextFormField(
                decoration: const InputDecoration(labelText: '密码'),
                obscureText: true,
                validator: (v) {
                  final value = v ?? '';
                  if (value.length < 8) return '密码至少8位';
                  if (!RegExp(r'[A-Za-z]').hasMatch(value) || !RegExp(r'\d').hasMatch(value)) return '需包含英文和数字';
                  return null;
                },
                onSaved: (v) => _password = v!,
              ),
              DropdownButtonFormField<int>(
                value: _gender,
                items: const [
                  DropdownMenuItem(value: 1, child: Text('男')),
                  DropdownMenuItem(value: 2, child: Text('女')),
                  DropdownMenuItem(value: 3, child: Text('未知')),
                ],
                onChanged: (v) => setState(() => _gender = v ?? 2),
                decoration: const InputDecoration(labelText: '性别'),
              ),
              InkWell(
                borderRadius: BorderRadius.circular(4),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    locale: const Locale('zh', 'CN'),
                    firstDate: DateTime(1900),
                    lastDate: DateTime.now(),
                    initialDate: _birthday ?? DateTime.now(),
                  );
                  if (picked != null) {
                    setState(() => _birthday = picked);
                  }
                },
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: '生日',
                    border: OutlineInputBorder(),
                  ),
                  child: Text(
                    birthdayText,
                    style: TextStyle(
                      color: _birthday == null ? Theme.of(context).hintColor : null,
                    ),
                  ),
                ),
              ),
              TextFormField(
                controller: _recoveryKeyController,
                readOnly: true,
                decoration: const InputDecoration(labelText: '恢复密钥，重置密码的唯一方式，请妥善保管'),
              ),
              Row(
                children: [
                  TextButton(
                    onPressed: () => setState(() {
                      _recoveryKey = randomRecoveryKey();
                      _recoveryKeyController.text = _recoveryKey;
                    }),
                    child: const Text('刷新密钥'),
                  ),
                  TextButton(
                    onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('密钥已复制'))),
                    child: const Text('复制恢复密钥'),
                  ),
                ],
              ),
              ElevatedButton(
                onPressed: disabled ? null : _submit,
                child: Text(disabled && _countdown > 0 ? '$_countdown 秒后可再次注册' : (_loading ? '提交中...' : '注册')),
              ),
              TextButton(
                onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
                child: const Text('已有账号？点此登录'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
