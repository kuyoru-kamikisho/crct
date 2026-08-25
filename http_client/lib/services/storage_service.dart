import 'dart:convert';
import 'dart:io';

import '../models/models.dart';
import 'app_paths.dart';

class StorageService {
  Future<AppSettings> loadSettings() async {
    final f = File(AppPaths.settingsFile);
    if (!await f.exists()) return AppSettings();
    try {
      return AppSettings.fromJson(jsonDecode(await f.readAsString()) as Map<String, dynamic>);
    } catch (_) {
      return AppSettings();
    }
  }

  Future<void> saveSettings(AppSettings s) async {
    await File(AppPaths.settingsFile)
        .writeAsString(const JsonEncoder.withIndent('  ').convert(s.toJson()));
  }

  Future<Map<String, Map<String, String>>> loadEnvironments() async {
    final f = File(AppPaths.envFile);
    if (!await f.exists()) return {};
    try {
      final raw = jsonDecode(await f.readAsString()) as Map<String, dynamic>;
      return raw.map((k, v) {
        final m = (v as Map).map((kk, vv) => MapEntry('$kk', '$vv'));
        return MapEntry(k, Map<String, String>.from(m));
      });
    } catch (_) {
      return {};
    }
  }

  Future<void> saveEnvironments(Map<String, Map<String, String>> envs) async {
    await File(AppPaths.envFile)
        .writeAsString(const JsonEncoder.withIndent('  ').convert(envs));
  }

  Future<List<HistoryItem>> loadHistory() async {
    final f = File(AppPaths.historyFile);
    if (!await f.exists()) return [];
    try {
      final list = jsonDecode(await f.readAsString()) as List<dynamic>;
      return list
          .map((e) => HistoryItem.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveHistory(List<HistoryItem> items) async {
    final trimmed = items.take(200).toList();
    await File(AppPaths.historyFile).writeAsString(
      const JsonEncoder.withIndent('  ').convert(trimmed.map((e) => e.toJson()).toList()),
    );
  }

  Future<String?> loadDraft() async {
    final f = File(AppPaths.draftFile);
    if (!await f.exists()) return null;
    return f.readAsString();
  }

  Future<void> saveDraft(String text) async {
    await File(AppPaths.draftFile).writeAsString(text);
  }
}
