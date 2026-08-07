import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/app_config.dart';
import '../services/config_service.dart';
import '../theme/app_theme.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({
    super.key,
    this.initial,
    this.asModal = false,
  });

  final AppConfig? initial;
  final bool asModal;

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _idCtrl;
  late final TextEditingController _urlCtrl;
  late final TextEditingController _logCtrl;
  late final TextEditingController _extraCtrl;
  late final TextEditingController _updateCtrl;
  late final TextEditingController _uaCtrl;
  late final TextEditingController _secretCtrl;

  bool _fullscreen = false;
  bool _allowMixed = true;
  bool _cacheEnabled = true;
  bool _keepScreenOn = false;
  String _backAction = 'webBack';
  bool _saving = false;
  String? _configPath;
  String? _defaultLog;

  @override
  void initState() {
    super.initState();
    final c = widget.initial ?? AppConfig();
    _nameCtrl = TextEditingController(text: c.projectName);
    _idCtrl = TextEditingController(text: c.projectId);
    _urlCtrl = TextEditingController(text: c.projectUrl);
    _logCtrl = TextEditingController(text: c.logPath);
    _extraCtrl = TextEditingController(text: c.extraInfo);
    _updateCtrl = TextEditingController(text: c.updateUrl);
    _uaCtrl = TextEditingController(text: c.userAgent);
    _secretCtrl = TextEditingController(text: c.bridgeSecret);
    _fullscreen = c.fullscreen;
    _allowMixed = c.allowMixedContent;
    _cacheEnabled = c.cacheEnabled;
    _keepScreenOn = c.keepScreenOn;
    _backAction = c.hardwareBackAction;
    _loadMeta();
  }

  Future<void> _loadMeta() async {
    final path = await ConfigService.instance.configFilePath();
    final log = await ConfigService.instance.defaultLogPath();
    if (!mounted) return;
    setState(() {
      _configPath = path;
      _defaultLog = log;
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _idCtrl.dispose();
    _urlCtrl.dispose();
    _logCtrl.dispose();
    _extraCtrl.dispose();
    _updateCtrl.dispose();
    _uaCtrl.dispose();
    _secretCtrl.dispose();
    super.dispose();
  }

  AppConfig _buildConfig() {
    return AppConfig(
      projectName: _nameCtrl.text.trim(),
      projectId: _idCtrl.text.trim(),
      projectUrl: _urlCtrl.text.trim(),
      logPath: _logCtrl.text.trim(),
      fullscreen: _fullscreen,
      extraInfo: _extraCtrl.text,
      updateUrl: _updateCtrl.text.trim(),
      userAgent: _uaCtrl.text.trim(),
      allowMixedContent: _allowMixed,
      cacheEnabled: _cacheEnabled,
      keepScreenOn: _keepScreenOn,
      hardwareBackAction: _backAction,
      bridgeSecret: _secretCtrl.text,
    );
  }

  Future<void> _save() async {
    final config = _buildConfig();
    final err = config.validate();
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
      return;
    }
    setState(() => _saving = true);
    try {
      await ConfigService.instance.save(config);
      if (!mounted) return;
      if (widget.asModal) {
        Navigator.of(context).pop(config);
      } else {
        Navigator.of(context).pushReplacementNamed('/web', arguments: config);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('保存失败: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _clear() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('清除配置'),
        content: const Text('将删除本地配置文件，下次启动会重新进入设置页。确定继续？'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('清除')),
        ],
      ),
    );
    if (ok != true) return;
    await ConfigService.instance.clear();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('配置已清除')),
    );
    setState(() {
      _nameCtrl.clear();
      _idCtrl.clear();
      _urlCtrl.clear();
      _logCtrl.clear();
      _extraCtrl.clear();
      _updateCtrl.clear();
      _uaCtrl.clear();
      _secretCtrl.clear();
      _fullscreen = false;
      _allowMixed = true;
      _cacheEnabled = true;
      _keepScreenOn = false;
      _backAction = 'webBack';
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0B3D3A),
              Color(0xFF14635C),
              Color(0xFF1A8A7A),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                    child: Row(
                      children: [
                        if (widget.asModal)
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close, color: Colors.white),
                          ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'WebEgg',
                                style: theme.textTheme.headlineMedium?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '配置 Web 项目外壳',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: Colors.white70,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Container(
                      margin: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.18),
                            blurRadius: 24,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
                          children: [
                            _sectionTitle('基础信息'),
                            _field('项目名称', _nameCtrl, hint: '例如：点餐平板'),
                            _field('项目 ID', _idCtrl, hint: '例如：order-pad-01'),
                            _field(
                              '项目 URL',
                              _urlCtrl,
                              hint: 'https://example.com/app/',
                              keyboard: TextInputType.url,
                            ),
                            const SizedBox(height: 20),
                            _sectionTitle('运行行为'),
                            SwitchListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('每次启动全屏'),
                              subtitle: const Text('覆盖状态栏 / 刘海区域'),
                              value: _fullscreen,
                              onChanged: (v) => setState(() => _fullscreen = v),
                            ),
                            SwitchListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('屏幕常亮'),
                              subtitle: const Text('适合自助 / 点餐场景'),
                              value: _keepScreenOn,
                              onChanged: (v) => setState(() => _keepScreenOn = v),
                            ),
                            SwitchListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('允许混合内容'),
                              subtitle: const Text('HTTPS 页面加载 HTTP 资源'),
                              value: _allowMixed,
                              onChanged: (v) => setState(() => _allowMixed = v),
                            ),
                            SwitchListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('启用 Web 缓存'),
                              value: _cacheEnabled,
                              onChanged: (v) => setState(() => _cacheEnabled = v),
                            ),
                            const SizedBox(height: 8),
                            Text('返回键行为', style: theme.textTheme.titleSmall),
                            const SizedBox(height: 8),
                            SegmentedButton<String>(
                              segments: const [
                                ButtonSegment(value: 'webBack', label: Text('网页后退')),
                                ButtonSegment(value: 'exit', label: Text('退出')),
                                ButtonSegment(value: 'ignore', label: Text('忽略')),
                              ],
                              selected: {_backAction},
                              onSelectionChanged: (s) =>
                                  setState(() => _backAction = s.first),
                            ),
                            const SizedBox(height: 20),
                            _sectionTitle('日志与更新'),
                            _field(
                              '日志保存路径',
                              _logCtrl,
                              hint: _defaultLog ?? '默认 ./logs/',
                            ),
                            if (_defaultLog != null)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Text(
                                  '留空则使用: $_defaultLog',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: AppTheme.muted,
                                  ),
                                ),
                              ),
                            _field(
                              '自动更新地址',
                              _updateCtrl,
                              hint: 'http://host/update/',
                              keyboard: TextInputType.url,
                            ),
                            const SizedBox(height: 20),
                            _sectionTitle('高级'),
                            _field('自定义 User-Agent', _uaCtrl, hint: '留空使用系统默认'),
                            _field(
                              'Bridge 校验串',
                              _secretCtrl,
                              hint: '可选，Web 调用时需携带',
                              obscure: true,
                            ),
                            Text('附加信息', style: theme.textTheme.titleSmall),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _extraCtrl,
                              maxLines: 6,
                              decoration: const InputDecoration(
                                hintText: 'JSON 或其他专属配置，Web 可通过 getConfig 读取',
                                alignLabelWithHint: true,
                              ),
                            ),
                            if (_configPath != null) ...[
                              const SizedBox(height: 16),
                              SelectableText(
                                '配置文件: $_configPath',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: AppTheme.muted,
                                ),
                              ),
                            ],
                            const SizedBox(height: 28),
                            Row(
                              children: [
                                if (widget.initial != null || widget.asModal)
                                  OutlinedButton(
                                    onPressed: _saving ? null : _clear,
                                    child: const Text('清除配置'),
                                  ),
                                const Spacer(),
                                FilledButton.icon(
                                  onPressed: _saving ? null : _save,
                                  icon: _saving
                                      ? const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : const Icon(Icons.check_rounded),
                                  label: Text(widget.asModal ? '保存' : '保存并进入'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 18,
            decoration: BoxDecoration(
              color: AppTheme.accent,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }

  Widget _field(
    String label,
    TextEditingController ctrl, {
    String? hint,
    TextInputType? keyboard,
    bool obscure = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: ctrl,
        keyboardType: keyboard,
        obscureText: obscure,
        inputFormatters: keyboard == TextInputType.url
            ? [FilteringTextInputFormatter.deny(RegExp(r'\s'))]
            : null,
        decoration: InputDecoration(labelText: label, hintText: hint),
      ),
    );
  }
}
