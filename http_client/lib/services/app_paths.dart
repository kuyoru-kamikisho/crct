import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;

/// 所有持久化数据放在可执行文件同级目录的 `http_client_data/` 下，
/// 不使用 AppData / 用户主目录。
class AppPaths {
  AppPaths._();

  static Directory? overrideRoot;

  static Directory get exeDir {
    if (overrideRoot != null) return overrideRoot!;
    return File(Platform.resolvedExecutable).parent;
  }

  static Directory get dataDir => Directory(p.join(exeDir.path, 'http_client_data'));

  static String get settingsFile => p.join(dataDir.path, 'settings.json');
  static String get historyFile => p.join(dataDir.path, 'history.json');
  static String get envFile => p.join(dataDir.path, 'http-client.env.json');
  static String get draftFile => p.join(dataDir.path, 'draft.http');
  static String get downloadsDir => p.join(dataDir.path, 'downloads');

  static Future<void> init() async {
    await dataDir.create(recursive: true);
    await Directory(downloadsDir).create(recursive: true);
    final env = File(envFile);
    if (!await env.exists()) {
      await env.writeAsString(const JsonEncoder.withIndent('  ').convert({
        'dev': {
          'host': 'https://httpbin.org',
          'token': 'dev-token',
          'username': 'demo',
        },
        'prod': {
          'host': 'https://httpbin.org',
          'token': 'prod-token',
          'username': 'prod-user',
        },
      }));
    }
  }
}
