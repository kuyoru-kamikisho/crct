import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:math';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

const String apiBaseUrl = 'http://localhost:8080/api/users';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final authStore = AuthStore();
  await authStore.init();
  runApp(MainApp(authStore: authStore));
}

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

class ApiClient {
  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$apiBaseUrl$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> get(String path) async {
    final response = await http.get(Uri.parse('$apiBaseUrl$path'));
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}

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
          Container(height: 120, margin: const EdgeInsets.all(16), color: Colors.grey.shade200),
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

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _api = ApiClient();
  final _formKey = GlobalKey<FormState>();
  String _username = '';
  String _password = '';
  int _gender = 2;
  DateTime? _birthday;
  String _recoveryKey = randomRecoveryKey();
  bool _loading = false;
  int _countdown = 0;
  bool _usernameAvailable = false;

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
              TextButton(
                onPressed: () async {
                  final picked = await showDatePicker(
                    context: context,
                    firstDate: DateTime(1900),
                    lastDate: DateTime.now(),
                    initialDate: DateTime.now(),
                  );
                  if (picked != null) {
                    setState(() => _birthday = picked);
                  }
                },
                child: Text(_birthday == null ? '选择生日(可选)' : _birthday.toString().substring(0, 10)),
              ),
              TextFormField(
                initialValue: _recoveryKey,
                readOnly: true,
                decoration: const InputDecoration(labelText: '恢复密钥'),
              ),
              Row(
                children: [
                  TextButton(
                    onPressed: () => setState(() => _recoveryKey = randomRecoveryKey()),
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

class RetrievePage extends StatefulWidget {
  const RetrievePage({super.key});

  @override
  State<RetrievePage> createState() => _RetrievePageState();
}

class _RetrievePageState extends State<RetrievePage> {
  final _api = ApiClient();
  bool _resetMode = true;
  final _formKey = GlobalKey<FormState>();
  String _username = '';
  String _userId = '';
  String _recoveryKey = '';
  String _newPassword = '';
  final String _newRecoveryKey = randomRecoveryKey();
  String _foundUsername = '';
  bool _loading = false;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _loading) {
      return;
    }
    _formKey.currentState!.save();
    setState(() => _loading = true);
    if (_resetMode) {
      final result = await _api.post('/retrieve/reset-password', {
        'username': _username,
        'userId': _userId,
        'recoveryKey': _recoveryKey,
        'newPassword': _newPassword,
        'newRecoveryKey': _newRecoveryKey,
      });
      if (!mounted) {
        return;
      }
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${result['msg']}')));
      if (result['code'] == 200) {
        Navigator.pushReplacementNamed(context, '/login');
      }
      return;
    }

    final result = await _api.get('/retrieve/username?userId=${Uri.encodeComponent(_userId)}');
    if (!mounted) {
      return;
    }
    setState(() {
      _loading = false;
      if (result['code'] == 200) {
        _foundUsername = '${(result['data'] as Map<String, dynamic>)['username']}';
      } else {
        _foundUsername = result['msg']?.toString() ?? '';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('找回密码/用户名')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              SwitchListTile(
                title: Text(_resetMode ? '当前：重置密码' : '当前：找回用户名'),
                value: _resetMode,
                onChanged: (v) => setState(() => _resetMode = v),
              ),
              if (_resetMode) ...[
                TextFormField(
                  decoration: const InputDecoration(labelText: '用户名(可选)'),
                  onSaved: (v) => _username = (v ?? '').trim(),
                ),
                TextFormField(
                  decoration: const InputDecoration(labelText: '用户ID(可选)'),
                  onSaved: (v) => _userId = (v ?? '').trim(),
                ),
                TextFormField(
                  decoration: const InputDecoration(labelText: '恢复密钥'),
                  validator: (v) => v == null || v.isEmpty ? '恢复密钥不能为空' : null,
                  onSaved: (v) => _recoveryKey = v!,
                ),
                TextFormField(
                  decoration: const InputDecoration(labelText: '新密码'),
                  obscureText: true,
                  validator: (v) => v != null && v.length >= 8 ? null : '密码至少8位',
                  onChanged: (v) => _newPassword = v,
                  onSaved: (v) => _newPassword = v!,
                ),
                TextFormField(
                  decoration: const InputDecoration(labelText: '确认新密码'),
                  obscureText: true,
                  validator: (v) => v == _newPassword ? null : '两次密码不一致',
                ),
                TextFormField(
                  initialValue: _newRecoveryKey,
                  readOnly: true,
                  decoration: const InputDecoration(labelText: '新恢复密钥'),
                ),
              ] else ...[
                TextFormField(
                  decoration: const InputDecoration(labelText: '用户ID'),
                  validator: (v) => v == null || v.trim().isEmpty ? '用户ID不能为空' : null,
                  onSaved: (v) => _userId = v!.trim(),
                ),
                if (_foundUsername.isNotEmpty) Text('查询结果：$_foundUsername'),
              ],
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: Text(_loading ? '处理中...' : '保存'),
              ),
              TextButton(onPressed: () => Navigator.pushReplacementNamed(context, '/'), child: const Text('取消')),
            ],
          ),
        ),
      ),
    );
  }
}

String randomRecoveryKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#\$%^&*()_+-=';
  final random = Random.secure();
  final length = 24 + random.nextInt(8);
  final sb = StringBuffer();
  for (int i = 0; i < length; i++) {
    sb.write(chars[random.nextInt(chars.length)]);
  }
  return sb.toString();
}
