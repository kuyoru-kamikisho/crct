import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../models/app_config.dart';

/// 配置文件读写服务。配置位于应用文档目录 config.json。
class ConfigService extends ChangeNotifier {
  ConfigService._();
  static final ConfigService instance = ConfigService._();

  static const configFileName = 'config.json';

  AppConfig? _config;
  AppConfig? get config => _config;
  bool get hasConfig => _config != null;

  Directory? _docDir;

  Future<Directory> get documentsDir async {
    _docDir ??= await getApplicationDocumentsDirectory();
    return _docDir!;
  }

  Future<File> get _configFile async {
    final dir = await documentsDir;
    return File(p.join(dir.path, configFileName));
  }

  /// 默认日志目录：文档目录/logs
  Future<String> defaultLogPath() async {
    final dir = await documentsDir;
    return p.join(dir.path, 'logs');
  }

  Future<String> resolveLogPath(AppConfig config) async {
    if (config.logPath.trim().isEmpty) return defaultLogPath();
    return config.logPath.trim();
  }

  Future<AppConfig?> load() async {
    try {
      final file = await _configFile;
      if (!await file.exists()) {
        _config = null;
        notifyListeners();
        return null;
      }
      final text = await file.readAsString();
      final map = jsonDecode(text) as Map<String, dynamic>;
      _config = AppConfig.fromJson(map);
      notifyListeners();
      return _config;
    } catch (e, st) {
      debugPrint('ConfigService.load error: $e\n$st');
      _config = null;
      notifyListeners();
      return null;
    }
  }

  Future<void> save(AppConfig config) async {
    final file = await _configFile;
    await file.parent.create(recursive: true);
    final encoded = const JsonEncoder.withIndent('  ').convert(config.toJson());
    await file.writeAsString(encoded);
    _config = config;
    notifyListeners();
  }

  Future<void> clear() async {
    try {
      final file = await _configFile;
      if (await file.exists()) await file.delete();
    } catch (e) {
      debugPrint('ConfigService.clear error: $e');
    }
    _config = null;
    notifyListeners();
  }

  Future<String> configFilePath() async => (await _configFile).path;
}
