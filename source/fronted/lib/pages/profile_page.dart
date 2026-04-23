import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api_client.dart';
import '../store/auth_store.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _api = ApiClient();
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _positionController = TextEditingController();
  final _bioController = TextEditingController();
  final _usernameFocus = FocusNode();

  bool _loading = true;
  bool _saving = false;
  bool _usernameChecking = false;
  bool _usernameAvailable = true;
  String _usernameHelper = '用户名将用于登录和展示';
  Map<String, dynamic>? _originalUser;
  int _gender = 2;
  DateTime? _birthday;

  int get _bioCount => _bioController.text.characters.length;
  int get _positionCount => _positionController.text.characters.length;

  @override
  void initState() {
    super.initState();
    _usernameFocus.addListener(() {
      if (!_usernameFocus.hasFocus) {
        _checkUsernameOnBlur();
      }
    });
    _loadUser();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _positionController.dispose();
    _bioController.dispose();
    _usernameFocus.dispose();
    super.dispose();
  }

  Future<void> _loadUser() async {
    final auth = context.read<AuthStore>();
    final userId = auth.user?['id'];
    if (userId == null) {
      if (mounted) {
        setState(() => _loading = false);
      }
      return;
    }
    final user = await _api.get('/$userId');
    if (!mounted) {
      return;
    }
    _applyUserData(user);
    setState(() => _loading = false);
  }

  void _applyUserData(Map<String, dynamic> user) {
    _originalUser = Map<String, dynamic>.from(user);
    _usernameController.text = '${user['username'] ?? ''}';
    _positionController.text = '${user['position'] ?? ''}';
    _bioController.text = '${user['bio'] ?? ''}';
    _gender = _parseInt(user['gender'], fallback: 2);
    _birthday = _parseDate(user['birthday']);
    _usernameAvailable = true;
    _usernameHelper = '用户名将用于登录和展示';
  }

  int _parseInt(dynamic value, {required int fallback}) {
    if (value is int) {
      return value;
    }
    return int.tryParse('$value') ?? fallback;
  }

  DateTime? _parseDate(dynamic value) {
    if (value == null) {
      return null;
    }
    if (value is int) {
      return DateTime.fromMillisecondsSinceEpoch(value);
    }
    final text = '$value';
    if (text.trim().isEmpty) {
      return null;
    }
    return DateTime.tryParse(text);
  }

  String _formatDate(DateTime? date) {
    if (date == null) {
      return '未设置';
    }
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  bool get _isDirty {
    final original = _originalUser;
    if (original == null) {
      return false;
    }
    return _usernameController.text.trim() != '${original['username'] ?? ''}' ||
        _positionController.text.trim() != '${original['position'] ?? ''}' ||
        _bioController.text.trim() != '${original['bio'] ?? ''}' ||
        _gender != _parseInt(original['gender'], fallback: 2) ||
        _formatDate(_birthday) != _formatDate(_parseDate(original['birthday']));
  }

  Future<void> _checkUsernameOnBlur() async {
    final original = _originalUser;
    if (original == null) {
      return;
    }
    final input = _usernameController.text.trim();
    final originalUsername = '${original['username'] ?? ''}';
    if (input.isEmpty) {
      if (!mounted) {
        return;
      }
      setState(() {
        _usernameAvailable = false;
        _usernameHelper = '用户名不能为空';
      });
      return;
    }
    if (input == originalUsername) {
      if (!mounted) {
        return;
      }
      setState(() {
        _usernameAvailable = true;
        _usernameHelper = '保持当前用户名';
      });
      return;
    }
    setState(() {
      _usernameChecking = true;
      _usernameHelper = '正在检查用户名可用性...';
    });
    final result = await _api.get(
      '/check-username?username=${Uri.encodeComponent(input)}',
    );
    if (!mounted) {
      return;
    }
    final available =
        ((result['data'] as Map<String, dynamic>?)?['available'] ?? false)
            as bool;
    setState(() {
      _usernameChecking = false;
      _usernameAvailable = available;
      _usernameHelper = available ? '用户名可用' : '用户名已存在';
    });
  }

  Future<void> _pickBirthday() async {
    final picked = await showDatePicker(
      context: context,
      locale: const Locale('zh', 'CN'),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      initialDate: _birthday ?? DateTime.now(),
    );
    if (picked != null && mounted) {
      setState(() => _birthday = picked);
    }
  }

  Future<bool> _confirm(String title, String content) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('确定'),
          ),
        ],
      ),
    );
    return ok ?? false;
  }

  Future<void> _cancelEdit() async {
    if (!_isDirty) {
      return;
    }
    final sure = await _confirm('放弃修改', '取消后您所做的更改都会丢失，是否继续？');
    if (!sure || !mounted || _originalUser == null) {
      return;
    }
    setState(() => _applyUserData(_originalUser!));
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('已重置表单')));
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() ||
        _saving ||
        _usernameChecking ||
        !_usernameAvailable) {
      return;
    }
    final sure = await _confirm('确认保存', '确认提交当前个人信息修改吗？');
    if (!sure || !mounted || _originalUser == null) {
      return;
    }

    setState(() => _saving = true);
    final payload = Map<String, dynamic>.from(_originalUser!)
      ..['username'] = _usernameController.text.trim()
      ..['birthday'] = _birthday == null ? null : _formatDate(_birthday)
      ..['bio'] = _bioController.text.trim()
      ..['gender'] = _gender
      ..['position'] = _positionController.text.trim();

    final userId = _originalUser!['id'];
    try {
      final updated = await _api.put('/$userId', payload);
      if (!mounted) {
        return;
      }
      _applyUserData(updated);
      await context.read<AuthStore>().saveSession(
        context.read<AuthStore>().token ?? '',
        Map<String, dynamic>.from(updated),
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('保存成功')));
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('保存失败，请稍后重试')));
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _deleteAccount() async {
    if (_originalUser == null) {
      return;
    }
    final sure = await _confirm('确认注销', '注销后账号将不可继续使用，是否确认注销？');
    if (!sure || !mounted) {
      return;
    }
    final userId = _originalUser!['id'];
    try {
      await _api.delete('/$userId');
      if (!mounted) {
        return;
      }
      await context.read<AuthStore>().clearSession();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('账号已注销')));
      Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('注销失败，请稍后重试')));
    }
  }

  Future<void> _logout() async {
    final sure = await _confirm('确认退出', '确定要退出登录吗？');
    if (!sure || !mounted) {
      return;
    }
    await context.read<AuthStore>().clearSession();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthStore>();
    if (!auth.loggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('个人中心')),
        body: Center(
          child: FilledButton(
            onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
            child: const Text('请先登录'),
          ),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('个人中心')),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 240),
        child: _loading
            ? const Center(
                key: ValueKey('loading'),
                child: CircularProgressIndicator(),
              )
            : Form(
                key: _formKey,
                child: ListView(
                  key: const ValueKey('form'),
                  padding: const EdgeInsets.all(16),
                  children: [
                    Text(
                      '用户ID：${_originalUser?['id'] ?? ''}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _usernameController,
                      focusNode: _usernameFocus,
                      decoration: InputDecoration(
                        labelText: '用户名',
                        helperText: _usernameHelper,
                        suffixIcon: _usernameChecking
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                ),
                              )
                            : null,
                      ),
                      validator: (v) {
                        final text = (v ?? '').trim();
                        if (text.isEmpty) {
                          return '用户名不能为空';
                        }
                        if (text.characters.length > 20) {
                          return '用户名最多20个字符';
                        }
                        if (!_usernameAvailable) {
                          return '用户名不可用';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    InkWell(
                      borderRadius: BorderRadius.circular(6),
                      onTap: _pickBirthday,
                      child: InputDecorator(
                        decoration: const InputDecoration(labelText: '生日'),
                        child: Text(_formatDate(_birthday)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text('性别'),
                    Wrap(
                      spacing: 12,
                      children: [
                        RadioMenuButton<int>(
                          value: 0,
                          groupValue: _gender,
                          onChanged: (v) => setState(() => _gender = v ?? 2),
                          child: const Text('女'),
                        ),
                        RadioMenuButton<int>(
                          value: 1,
                          groupValue: _gender,
                          onChanged: (v) => setState(() => _gender = v ?? 2),
                          child: const Text('男'),
                        ),
                        RadioMenuButton<int>(
                          value: 2,
                          groupValue: _gender,
                          onChanged: (v) => setState(() => _gender = v ?? 2),
                          child: const Text('未知'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _positionController,
                      decoration: InputDecoration(
                        labelText: '职位',
                        helperText: '$_positionCount/60',
                      ),
                      validator: (v) {
                        final count = (v ?? '').trim().characters.length;
                        if (count > 60) {
                          return '职位最多60个字符';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _bioController,
                      maxLines: 5,
                      decoration: InputDecoration(
                        labelText: '简介',
                        alignLabelWithHint: true,
                        helperText: '$_bioCount/300',
                      ),
                      validator: (v) {
                        final count = (v ?? '').trim().characters.length;
                        if (count > 300) {
                          return '简介最多300个字符';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _saving ? null : _cancelEdit,
                            child: const Text('取消'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            onPressed: _saving ? null : _save,
                            child: Text(_saving ? '保存中...' : '保存'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Expanded(
                          child: TextButton(
                            onPressed: _logout,
                            child: const Text('退出登录'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextButton(
                            onPressed: _saving ? null : _deleteAccount,
                            style: TextButton.styleFrom(
                              foregroundColor: const Color(0xFFFF6B6B),
                            ),
                            child: const Text('注销用户'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
