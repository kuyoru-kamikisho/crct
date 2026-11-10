import 'package:flutter/material.dart';

import '../models/app_settings.dart';
import '../services/app_controller.dart';
import '../theme.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({required this.app, super.key});

  final AppController app;

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  late final TextEditingController _updateUrl;
  late final TextEditingController _versionUrl;
  late final TextEditingController _days;
  String? _error;

  @override
  void initState() {
    super.initState();
    final settings = widget.app.settings;
    _updateUrl = TextEditingController(text: settings.updateUrl);
    _versionUrl = TextEditingController(text: settings.versionCheckUrl);
    _days = TextEditingController(text: '${settings.logRetentionDays}');
  }

  @override
  void dispose() {
    _updateUrl.dispose();
    _versionUrl.dispose();
    _days.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    return ListenableBuilder(
      listenable: app,
      builder: (context, _) {
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
          children: [
            const Text('设置', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('当前版本 ${app.version}', style: const TextStyle(color: kMuted, fontSize: 12)),
            const SizedBox(height: 14),
            Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('更新', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _updateUrl,
                    decoration: const InputDecoration(labelText: '更新地址'),
                    onSubmitted: (_) => _saveText(),
                    onEditingComplete: _saveText,
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _versionUrl,
                    decoration: const InputDecoration(labelText: '版本检查地址'),
                    onSubmitted: (_) => _saveText(),
                    onEditingComplete: _saveText,
                  ),
                  const SizedBox(height: 4),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: const Text('自动更新', style: TextStyle(fontSize: 13)),
                    subtitle: const Text('启动时对比 versioninfo，有新版本就下载并替换自身', style: TextStyle(fontSize: 12)),
                    value: app.settings.autoUpdate,
                    onChanged: (value) => _save(app.settings.copyWith(autoUpdate: value)),
                  ),
                  Row(
                    children: [
                      FilledButton(
                        onPressed: app.updating ? null : () => app.checkUpdate(manual: true),
                        child: Text(app.updating ? '正在更新' : '立即检查更新'),
                      ),
                      const SizedBox(width: 12),
                      if (app.updateMessage.isNotEmpty)
                        Expanded(child: Text(app.updateMessage, style: const TextStyle(color: kMuted, fontSize: 12))),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Panel(
              child: Column(
                children: [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: const Text('开机自启', style: TextStyle(fontSize: 13)),
                    subtitle: const Text('默认关闭。只写入当前用户的启动项', style: TextStyle(fontSize: 12)),
                    value: app.settings.runAtStartup,
                    onChanged: (value) => _save(app.settings.copyWith(runAtStartup: value)),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _days,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: '日志保留天数'),
                    onSubmitted: (_) => _saveText(),
                    onEditingComplete: _saveText,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(_error!, style: const TextStyle(color: kDanger, fontSize: 12)),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            Panel(
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      app.exeDir,
                      style: const TextStyle(fontSize: 12, color: kMuted),
                    ),
                  ),
                  TextButton(onPressed: app.openDataFolder, child: const Text('打开目录')),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '日志、设置、录制文件和更新缓存都放在程序旁边，不写入其他磁盘上的用户目录。开机自启使用系统启动项。手柄回放需要同目录的 ViGEmClient.dll，以及已经安装的 ViGEmBus。',
              style: TextStyle(color: kMuted, fontSize: 12, height: 1.4),
            ),
          ],
        );
      },
    );
  }

  void _saveText() {
    final updateUrl = _updateUrl.text.trim();
    final versionUrl = _versionUrl.text.trim();
    final days = int.tryParse(_days.text.trim());
    if (!updateUrl.startsWith('http://') && !updateUrl.startsWith('https://')) {
      setState(() => _error = '更新地址需要以 http:// 或 https:// 开头');
      return;
    }
    if (!versionUrl.startsWith('http://') && !versionUrl.startsWith('https://')) {
      setState(() => _error = '版本检查地址需要以 http:// 或 https:// 开头');
      return;
    }
    if (days == null || days < 1 || days > 90) {
      setState(() => _error = '日志保留天数需要在 1 到 90 之间');
      return;
    }
    setState(() => _error = null);
    _save(widget.app.settings.copyWith(
      updateUrl: updateUrl,
      versionCheckUrl: versionUrl,
      logRetentionDays: days,
    ));
  }

  void _save(AppSettings next) {
    widget.app.saveSettings(next);
  }
}
