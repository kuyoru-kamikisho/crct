import 'package:flutter/material.dart';

import '../services/app_controller.dart';
import '../theme.dart';
import 'home_page.dart';
import 'recordings_page.dart';
import 'settings_page.dart';

class ShellPage extends StatefulWidget {
  const ShellPage({required this.app, super.key});

  final AppController app;

  @override
  State<ShellPage> createState() => _ShellPageState();
}

class _ShellPageState extends State<ShellPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (widget.app.initError != null) return;
      await widget.app.promptRecovery();
      await widget.app.checkUpdate(manual: false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.app,
      builder: (context, _) {
        final app = widget.app;
        if (app.initError != null) {
          return Scaffold(body: Center(child: Text(app.initError!, style: const TextStyle(fontSize: 14))));
        }
        return Scaffold(
          body: Row(
            children: [
              _Sidebar(app: app),
              Expanded(
                child: Column(
                  children: [
                    if (app.activity != RunActivity.idle) _Banner(app: app),
                    Expanded(child: _page(app)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _page(AppController app) {
    switch (app.page) {
      case 1:
        return RecordingsPage(app: app);
      case 2:
        return SettingsPage(app: app);
      default:
        return HomePage(app: app);
    }
  }
}

class _Sidebar extends StatelessWidget {
  const _Sidebar({required this.app});

  final AppController app;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 188,
      color: kSidebar,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Kacher', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                SizedBox(height: 2),
                Text('操作录制与播放', style: TextStyle(color: kMuted, fontSize: 12)),
              ],
            ),
          ),
          _NavItem(label: '欢迎', selected: app.page == 0, onTap: () => app.setPage(0)),
          _NavItem(label: '已录制操作', selected: app.page == 1, onTap: () => app.setPage(1)),
          _NavItem(label: '设置', selected: app.page == 2, onTap: () => app.setPage(2)),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
            child: Text('v${app.version}', style: const TextStyle(color: kMuted, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: Material(
        color: selected ? const Color(0xFF232833) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              children: [
                Container(
                  width: 3,
                  height: 14,
                  decoration: BoxDecoration(
                    color: selected ? kAccent : Colors.transparent,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    color: selected ? kText : kMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.app});

  final AppController app;

  @override
  Widget build(BuildContext context) {
    final playing = app.activity == RunActivity.playing;
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: const BoxDecoration(
        color: Color(0xFF24181C),
        border: Border(bottom: BorderSide(color: kLine)),
      ),
      child: Row(
        children: [
          Expanded(child: Text(app.banner, style: const TextStyle(fontSize: 13))),
          if (playing)
            TextButton(
              onPressed: app.togglePause,
              child: Text(app.paused ? '继续' : '暂停'),
            ),
          TextButton(onPressed: app.stopActive, child: const Text('停止')),
        ],
      ),
    );
  }
}
