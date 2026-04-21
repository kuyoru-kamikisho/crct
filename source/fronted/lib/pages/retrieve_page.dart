import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_client.dart';
import '../utils/recovery_key.dart';

class RetrievePage extends StatefulWidget {
  const RetrievePage({super.key});

  @override
  State<RetrievePage> createState() => _RetrievePageState();
}

class _RetrievePageState extends State<RetrievePage> {
  final _api = ApiClient();
  bool _resetMode = true;
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _newRecoveryKeyController;
  String _username = '';
  String _userId = '';
  String _recoveryKey = '';
  String _newPassword = '';
  String _newRecoveryKey = randomRecoveryKey();
  String _foundUsername = '';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _newRecoveryKeyController = TextEditingController(text: _newRecoveryKey);
  }

  @override
  void dispose() {
    _newRecoveryKeyController.dispose();
    super.dispose();
  }

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
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _newRecoveryKeyController,
                        readOnly: true,
                        decoration: const InputDecoration(labelText: '新恢复密钥'),
                      ),
                    ),
                    TextButton(
                      onPressed: () => setState(() {
                        _newRecoveryKey = randomRecoveryKey();
                        _newRecoveryKeyController.text = _newRecoveryKey;
                      }),
                      child: const Text('更换密钥'),
                    ),
                    TextButton(
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: _newRecoveryKeyController.text));
                        if (!mounted) {
                          return;
                        }
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('密钥已复制到剪贴板')),
                        );
                      },
                      child: const Text('复制密钥'),
                    ),
                  ],
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
