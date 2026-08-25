import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http_client/services/app_paths.dart';
import 'package:http_client/services/storage_service.dart';
import 'package:path/path.dart' as p;

void main() {
  group('StorageService', () {
    late Directory tmp;

    setUp(() async {
      tmp = await Directory.systemTemp.createTemp('http_client_test_');
      AppPaths.overrideRoot = tmp;
      await AppPaths.init();
    });

    tearDown(() async {
      AppPaths.overrideRoot = null;
      if (await tmp.exists()) await tmp.delete(recursive: true);
    });

    test('stores data under exe-sibling http_client_data', () async {
      expect(AppPaths.dataDir.path, p.join(tmp.path, 'http_client_data'));
      expect(await AppPaths.dataDir.exists(), isTrue);
      expect(await File(AppPaths.envFile).exists(), isTrue);
    });

    test('persists settings history and draft', () async {
      final storage = StorageService();
      final settings = await storage.loadSettings();
      settings.darkTheme = false;
      settings.selectedEnv = 'dev';
      await storage.saveSettings(settings);

      final loaded = await storage.loadSettings();
      expect(loaded.darkTheme, isFalse);
      expect(loaded.selectedEnv, 'dev');

      await storage.saveDraft('GET https://x.com\n');
      expect(await storage.loadDraft(), 'GET https://x.com\n');
    });
  });
}
