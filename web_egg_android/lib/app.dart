import 'package:flutter/material.dart';

import 'models/app_config.dart';
import 'pages/settings_page.dart';
import 'pages/web_shell_page.dart';
import 'services/config_service.dart';
import 'services/device_service.dart';
import 'services/log_service.dart';
import 'services/update_service.dart';
import 'theme/app_theme.dart';
import 'widgets/update_prompt.dart';

class WebEggApp extends StatelessWidget {
  const WebEggApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WebEgg',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const BootPage(),
      routes: {
        '/settings': (_) => const SettingsPage(),
        '/web': (ctx) {
          final args = ModalRoute.of(ctx)?.settings.arguments;
          final config = args is AppConfig
              ? args
              : ConfigService.instance.config ?? AppConfig();
          return WebShellPage(config: config);
        },
      },
    );
  }
}

/// 启动页：加载配置、检查待安装更新。
class BootPage extends StatefulWidget {
  const BootPage({super.key});

  @override
  State<BootPage> createState() => _BootPageState();
}

class _BootPageState extends State<BootPage> {
  String _status = '正在启动…';

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    try {
      setState(() => _status = '读取配置…');
      await DeviceService.instance.init();
      final config = await ConfigService.instance.load();

      if (config != null) {
        final logPath = await ConfigService.instance.resolveLogPath(config);
        await LogService.instance.init(logPath: logPath);
        await LogService.instance.info(
          '启动 WebEgg，项目=${config.projectName} (${config.projectId})',
        );
      } else {
        await LogService.instance.init();
        await LogService.instance.info('首次启动，进入设置页');
      }

      if (!mounted) return;

      // 有待安装更新则提示
      final pending = await UpdateService.instance.loadPending();
      if (pending != null && mounted) {
        setState(() => _status = '发现新版本…');
        final install = await showUpdatePrompt(context, pending);
        if (install == true) {
          await UpdateService.instance.installPending(pending);
          // 用户可能取消系统安装器，继续进入应用
        }
      }

      if (!mounted) return;
      if (config == null) {
        Navigator.of(context).pushReplacementNamed('/settings');
      } else {
        Navigator.of(context).pushReplacementNamed('/web', arguments: config);
      }
    } catch (e) {
      await LogService.instance.error('启动异常: $e');
      if (!mounted) return;
      setState(() => _status = '启动失败，进入设置页…');
      await Future<void>.delayed(const Duration(milliseconds: 600));
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/settings');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
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
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'WebEgg',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 36,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                _status,
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
              const SizedBox(height: 28),
              const SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(
                  strokeWidth: 2.4,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
