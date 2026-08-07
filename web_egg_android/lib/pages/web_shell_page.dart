import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../models/app_config.dart';
import '../services/bridge_service.dart';
import '../services/config_service.dart';
import '../services/log_service.dart';
import '../services/update_service.dart';
import '../theme/app_theme.dart';
import 'settings_page.dart';

class WebShellPage extends StatefulWidget {
  const WebShellPage({super.key, required this.config});

  final AppConfig config;

  @override
  State<WebShellPage> createState() => _WebShellPageState();
}

class _WebShellPageState extends State<WebShellPage> {
  late AppConfig _config;
  WebViewController? _controller;
  BridgeService? _bridge;
  String? _bridgeJs;
  var _loading = true;
  var _progress = 0;
  String? _error;
  var _readyNotified = false;

  @override
  void initState() {
    super.initState();
    _config = widget.config;
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await BridgeService.applyFullscreen(_config.fullscreen);
    await BridgeService.applyKeepScreenOn(_config.keepScreenOn);
    _bridgeJs = await rootBundle.loadString('assets/js/bridge.js');
    await _initWebView();
    // 后台静默检查更新，不阻塞页面
    final updateUrl = _config.updateUrl.trim();
    if (updateUrl.isNotEmpty) {
      UpdateService.instance.checkAndDownloadSilent(updateUrl);
    }
  }

  Future<void> _initWebView() async {
    late final PlatformWebViewControllerCreationParams params;
    if (WebViewPlatform.instance is AndroidWebViewPlatform) {
      params = AndroidWebViewControllerCreationParams();
    } else {
      params = const PlatformWebViewControllerCreationParams();
    }

    final controller = WebViewController.fromPlatformCreationParams(params);
    _bridge = BridgeService(
      getController: () => _controller,
      getConfig: () => _config,
      getContext: () => mounted ? context : null,
      onNavigate: (url) async {
        await controller.loadRequest(Uri.parse(url));
      },
      onReload: () async {
        await controller.reload();
      },
      onClearCache: () async {
        await controller.clearCache();
        await controller.clearLocalStorage();
      },
      onConfigChanged: (c) async {
        setState(() => _config = c);
      },
      onOpenSettings: () {
        _openSettings();
      },
    );

    await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    await controller.setBackgroundColor(Colors.white);
    await controller.addJavaScriptChannel(
      BridgeService.channelName,
      onMessageReceived: (msg) {
        _bridge?.handleMessage(msg.message);
      },
    );

    if (_config.userAgent.trim().isNotEmpty) {
      await controller.setUserAgent(_config.userAgent.trim());
    }

    if (controller.platform is AndroidWebViewController) {
      final android = controller.platform as AndroidWebViewController;
      await android.setMediaPlaybackRequiresUserGesture(false);
      AndroidWebViewController.enableDebugging(kDebugMode);
      try {
        await android.setAllowFileAccess(true);
      } catch (_) {}
      await android.setMixedContentMode(
        _config.allowMixedContent
            ? MixedContentMode.alwaysAllow
            : MixedContentMode.neverAllow,
      );
    }

    await controller.setNavigationDelegate(
      NavigationDelegate(
        onProgress: (p) {
          if (!mounted) return;
          setState(() => _progress = p);
        },
        onPageStarted: (url) {
          if (!mounted) return;
          setState(() {
            _loading = true;
            _error = null;
            _readyNotified = false;
          });
        },
        onPageFinished: (url) async {
          if (!mounted) return;
          setState(() => _loading = false);
          await _injectBridge();
        },
        onWebResourceError: (err) {
          // 主框架错误才展示
          if (err.isForMainFrame == true) {
            if (!mounted) return;
            setState(() {
              _loading = false;
              _error = err.description;
            });
            LogService.instance.error('Web 加载错误: ${err.description}');
          }
        },
        onNavigationRequest: (req) => NavigationDecision.navigate,
      ),
    );

    _controller = controller;
    if (!mounted) return;
    setState(() {});
    await _loadUrl(_config.projectUrl);
  }

  Future<void> _injectBridge() async {
    final js = _bridgeJs;
    final controller = _controller;
    if (js == null || controller == null) return;
    try {
      await controller.runJavaScript(js);
      if (_config.bridgeSecret.isNotEmpty) {
        final secret = _config.bridgeSecret
            .replaceAll(r'\', r'\\')
            .replaceAll("'", r"\'");
        await controller.runJavaScript("window.WebEgg.setSecret('$secret');");
      }
      await _bridge?.notifyReady();
      if (!_readyNotified) {
        _readyNotified = true;
        await _bridge?.postEvent('shellReady', {
          'projectId': _config.projectId,
          'projectName': _config.projectName,
        });
      }
    } catch (e) {
      debugPrint('inject bridge error: $e');
    }
  }

  Future<void> _loadUrl(String url) async {
    final controller = _controller;
    if (controller == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await controller.loadRequest(Uri.parse(url));
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _openSettings() async {
    final result = await Navigator.of(context).push<AppConfig>(
      MaterialPageRoute(
        builder: (_) => SettingsPage(initial: _config, asModal: true),
      ),
    );
    if (result == null || !mounted) return;
    final urlChanged = result.projectUrl != _config.projectUrl;
    final uaChanged = result.userAgent != _config.userAgent;
    setState(() => _config = result);
    await BridgeService.applyFullscreen(result.fullscreen);
    await BridgeService.applyKeepScreenOn(result.keepScreenOn);
    final logPath = await ConfigService.instance.resolveLogPath(result);
    await LogService.instance.setLogPath(logPath);
    if (uaChanged && _controller != null) {
      await _controller!.setUserAgent(
        result.userAgent.trim().isEmpty ? null : result.userAgent.trim(),
      );
    }
    if (urlChanged) {
      await _loadUrl(result.projectUrl);
    }
  }

  Future<bool> _onWillPop() async {
    final action = _config.hardwareBackAction;
    if (action == 'ignore') return false;
    if (action == 'exit') return true;
    final controller = _controller;
    if (controller != null && await controller.canGoBack()) {
      await controller.goBack();
      return false;
    }
    return true;
  }

  @override
  void dispose() {
    BridgeService.applyFullscreen(false);
    BridgeService.applyKeepScreenOn(false);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final should = await _onWillPop();
        if (should && context.mounted) {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          top: !_config.fullscreen,
          bottom: !_config.fullscreen,
          left: !_config.fullscreen,
          right: !_config.fullscreen,
          child: Stack(
            children: [
              if (_controller != null)
                Positioned.fill(child: WebViewWidget(controller: _controller!))
              else
                const Center(child: CircularProgressIndicator()),
              if (_loading && _error == null)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(
                    value: _progress > 0 && _progress < 100
                        ? _progress / 100
                        : null,
                    minHeight: 2,
                    color: AppTheme.accent,
                    backgroundColor: Colors.transparent,
                  ),
                ),
              if (_error != null)
                Positioned.fill(
                  child: _ErrorPanel(
                    message: _error!,
                    onRetry: () => _loadUrl(_config.projectUrl),
                    onSettings: _openSettings,
                  ),
                ),
              // 隐藏入口：左上角长按打开设置
              Positioned(
                top: 0,
                left: 0,
                child: GestureDetector(
                  behavior: HitTestBehavior.translucent,
                  onLongPress: _openSettings,
                  child: const SizedBox(width: 48, height: 48),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({
    required this.message,
    required this.onRetry,
    required this.onSettings,
  });

  final String message;
  final VoidCallback onRetry;
  final VoidCallback onSettings;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppTheme.surface,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 56, color: AppTheme.muted),
              const SizedBox(height: 16),
              Text(
                '页面加载失败',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.muted,
                    ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton(
                    onPressed: onSettings,
                    child: const Text('打开设置'),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    onPressed: onRetry,
                    child: const Text('重试'),
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
