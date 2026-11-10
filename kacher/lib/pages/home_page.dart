import 'package:flutter/material.dart';

import '../services/app_controller.dart';
import '../theme.dart';

class HomePage extends StatefulWidget {
  const HomePage({required this.app, super.key});

  final AppController app;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final TextEditingController _command = TextEditingController();

  @override
  void dispose() {
    _command.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
      children: [
        const Text('欢迎使用', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        const Text(
          '录制鼠标、键盘和手柄操作，并按原始时间间隔回放。按下快捷键，或输入菜单名称后回车。',
          style: TextStyle(color: kMuted, fontSize: 13, height: 1.45),
        ),
        if (app.availableVersion != null) ...[
          const SizedBox(height: 12),
          Panel(
            child: Row(
              children: [
                Expanded(child: Text('发现新版本 ${app.availableVersion}', style: const TextStyle(fontSize: 13))),
                FilledButton(
                  onPressed: app.updating ? null : () => app.checkUpdate(manual: true),
                  child: const Text('立即更新'),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 14),
        const Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('快捷键', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              SizedBox(height: 8),
              _HotkeyRow(keys: 'Ctrl + Alt + R', action: '开始录制'),
              _HotkeyRow(keys: 'Ctrl + Alt + S', action: '停止录制或播放'),
              _HotkeyRow(keys: 'Ctrl + Alt + P', action: '播放当前选中的操作'),
              _HotkeyRow(keys: 'Ctrl + Alt + Space', action: '暂停或继续播放'),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('命令', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              TextField(
                controller: _command,
                autofocus: true,
                decoration: const InputDecoration(hintText: '输入菜单名称，例如：操作录制'),
                onSubmitted: (value) async {
                  _command.clear();
                  await app.runCommand(value);
                },
              ),
              const SizedBox(height: 8),
              const Text(
                '可用：操作录制、播放、停止、暂停、已录制操作、设置',
                style: TextStyle(color: kMuted, fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          '录制前会再次提示：不要录下银行卡号、密码等隐私信息。Win、Fn 等特殊键可能录不到。',
          style: TextStyle(color: kMuted, fontSize: 12, height: 1.4),
        ),
      ],
    );
  }
}

class _HotkeyRow extends StatelessWidget {
  const _HotkeyRow({required this.keys, required this.action});

  final String keys;
  final String action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          SizedBox(
            width: 168,
            child: Text(keys, style: const TextStyle(fontSize: 13, color: kAccent, fontWeight: FontWeight.w600)),
          ),
          Expanded(child: Text(action, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
