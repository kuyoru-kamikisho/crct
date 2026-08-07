import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../models/app_config.dart';
import 'config_service.dart';
import 'device_service.dart';
import 'log_service.dart';

typedef BridgeNavigateCallback = Future<void> Function(String url);
typedef BridgeReloadCallback = Future<void> Function();
typedef BridgeClearCacheCallback = Future<void> Function();
typedef BridgeConfigChangedCallback = Future<void> Function(AppConfig config);
typedef BridgeOpenSettingsCallback = void Function();

/// 处理 WebView JavascriptChannel 消息并回调 Web。
class BridgeService {
  BridgeService({
    required this.getController,
    required this.getConfig,
    required this.getContext,
    this.onNavigate,
    this.onReload,
    this.onClearCache,
    this.onConfigChanged,
    this.onOpenSettings,
  });

  final WebViewController? Function() getController;
  final AppConfig Function() getConfig;
  final BuildContext? Function() getContext;
  BridgeNavigateCallback? onNavigate;
  BridgeReloadCallback? onReload;
  BridgeClearCacheCallback? onClearCache;
  BridgeConfigChangedCallback? onConfigChanged;
  BridgeOpenSettingsCallback? onOpenSettings;

  static const channelName = 'WebEggChannel';

  Future<void> handleMessage(String message) async {
    Map<String, dynamic> req;
    try {
      req = jsonDecode(message) as Map<String, dynamic>;
    } catch (_) {
      return;
    }

    final id = req['id']?.toString() ?? '';
    final method = req['method']?.toString() ?? '';
    final params = req['params'];
    final secret = req['secret']?.toString() ?? '';

    final config = getConfig();
    if (config.bridgeSecret.isNotEmpty && secret != config.bridgeSecret) {
      await _reply(id, ok: false, error: 'invalid bridge secret');
      return;
    }

    try {
      final data = await _dispatch(method, params);
      await _reply(id, ok: true, data: data);
    } catch (e) {
      await LogService.instance.warn('Bridge.$method error: $e');
      await _reply(id, ok: false, error: e.toString());
    }
  }

  Future<dynamic> _dispatch(String method, dynamic params) async {
    switch (method) {
      case 'exitApp':
        await LogService.instance.info('Web 请求退出应用');
        await SystemNavigator.pop();
        exit(0);
      case 'setFullscreen':
        final enabled = params == true ||
            (params is Map && params['enabled'] == true) ||
            (params is Map && params['value'] == true);
        return _setFullscreen(enabled);
      case 'writeLog':
        final msg = params is String
            ? params
            : (params is Map
                ? (params['message'] ?? params['text'] ?? '').toString()
                : params?.toString() ?? '');
        await LogService.instance.write(msg, level: 'WEB');
        return {'written': true};
      case 'getConfig':
        return getConfig().toJson();
      case 'getDeviceInfo':
        return DeviceService.instance.collect(getContext());
      case 'setConfig':
        if (params is! Map) throw ArgumentError('params must be object');
        return _setConfig(Map<String, dynamic>.from(params));
      case 'reload':
        await onReload?.call();
        return {'reloaded': true};
      case 'openUrl':
        final url = params is String
            ? params
            : (params is Map ? params['url']?.toString() : null);
        if (url == null || url.isEmpty) throw ArgumentError('url required');
        await onNavigate?.call(url);
        return {'url': url};
      case 'clearCache':
        await onClearCache?.call();
        return {'cleared': true};
      case 'getAppVersion':
        return {'version': await DeviceService.instance.appVersion};
      case 'setKeepScreenOn':
        final enabled = params == true ||
            (params is Map && params['enabled'] == true) ||
            (params is Map && params['value'] == true);
        return _setKeepScreenOn(enabled);
      case 'toast':
        final msg = params is String
            ? params
            : (params is Map
                ? (params['message'] ?? params['text'] ?? '').toString()
                : params?.toString() ?? '');
        final ctx = getContext();
        if (ctx != null && ctx.mounted) {
          ScaffoldMessenger.of(ctx).showSnackBar(
            SnackBar(content: Text(msg), duration: const Duration(seconds: 2)),
          );
        }
        return {'shown': true};
      case 'openSettings':
        onOpenSettings?.call();
        return {'opened': true};
      case 'ping':
        return {'pong': true, 'ts': DateTime.now().toIso8601String()};
      default:
        throw UnsupportedError('unknown method: $method');
    }
  }

  Future<Map<String, dynamic>> _setFullscreen(bool enabled) async {
    final config = getConfig();
    config.fullscreen = enabled;
    await ConfigService.instance.save(config);
    await applyFullscreen(enabled);
    await onConfigChanged?.call(config);
    return {'fullscreen': enabled};
  }

  Future<Map<String, dynamic>> _setKeepScreenOn(bool enabled) async {
    final config = getConfig();
    config.keepScreenOn = enabled;
    await ConfigService.instance.save(config);
    await applyKeepScreenOn(enabled);
    await onConfigChanged?.call(config);
    return {'keepScreenOn': enabled};
  }

  Future<Map<String, dynamic>> _setConfig(Map<String, dynamic> partial) async {
    final config = getConfig();
    config.applyPartial(partial);
    await ConfigService.instance.save(config);
    if (partial.containsKey('fullscreen')) {
      await applyFullscreen(config.fullscreen);
    }
    if (partial.containsKey('keepScreenOn')) {
      await applyKeepScreenOn(config.keepScreenOn);
    }
    if (partial.containsKey('logPath')) {
      final path = await ConfigService.instance.resolveLogPath(config);
      await LogService.instance.setLogPath(path);
    }
    await onConfigChanged?.call(config);
    return config.toJson();
  }

  Future<void> _reply(String id, {required bool ok, dynamic data, String? error}) async {
    if (id.isEmpty) return;
    final controller = getController();
    if (controller == null) return;
    final payload = jsonEncode({
      'id': id,
      'ok': ok,
      if (data != null) 'data': data,
      if (error != null) 'error': error,
    });
    final js =
        'window.WebEgg && window.WebEgg.__nativeCallback && window.WebEgg.__nativeCallback($payload);';
    try {
      await controller.runJavaScript(js);
    } catch (e) {
      debugPrint('Bridge reply error: $e');
    }
  }

  /// 通知 Web 桥接已就绪。
  Future<void> notifyReady() async {
    final controller = getController();
    if (controller == null) return;
    try {
      await controller.runJavaScript(
        'window.WebEgg && window.WebEgg.__setReady && window.WebEgg.__setReady();',
      );
    } catch (e) {
      debugPrint('Bridge notifyReady error: $e');
    }
  }

  /// 原生主动向 Web 推送事件。
  Future<void> postEvent(String event, [dynamic data]) async {
    final controller = getController();
    if (controller == null) return;
    final payload = jsonEncode({'event': event, 'data': data});
    try {
      await controller.runJavaScript(
        'window.WebEgg && window.WebEgg.__onNativeEvent && window.WebEgg.__onNativeEvent($payload);',
      );
    } catch (e) {
      debugPrint('Bridge postEvent error: $e');
    }
  }

  static Future<void> applyFullscreen(bool enabled) async {
    if (enabled) {
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
  }

  static Future<void> applyKeepScreenOn(bool enabled) async {
    try {
      if (enabled) {
        await WakelockPlus.enable();
      } else {
        await WakelockPlus.disable();
      }
    } catch (e) {
      debugPrint('applyKeepScreenOn error: $e');
    }
  }
}
