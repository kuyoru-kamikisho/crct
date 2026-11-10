import 'dart:convert';
import 'dart:io';

class AppSettings {
  const AppSettings({
    required this.updateUrl,
    required this.versionCheckUrl,
    required this.autoUpdate,
    required this.runAtStartup,
    required this.logRetentionDays,
  });

  static const defaultUpdateUrl = 'https://app.release.com/latest.exe';
  static const defaultVersionUrl = 'https://app.release.com/versioninfo';

  final String updateUrl;
  final String versionCheckUrl;
  final bool autoUpdate;
  final bool runAtStartup;
  final int logRetentionDays;

  static const fallback = AppSettings(
    updateUrl: defaultUpdateUrl,
    versionCheckUrl: defaultVersionUrl,
    autoUpdate: true,
    runAtStartup: false,
    logRetentionDays: 7,
  );

  AppSettings copyWith({
    String? updateUrl,
    String? versionCheckUrl,
    bool? autoUpdate,
    bool? runAtStartup,
    int? logRetentionDays,
  }) {
    return AppSettings(
      updateUrl: updateUrl ?? this.updateUrl,
      versionCheckUrl: versionCheckUrl ?? this.versionCheckUrl,
      autoUpdate: autoUpdate ?? this.autoUpdate,
      runAtStartup: runAtStartup ?? this.runAtStartup,
      logRetentionDays: logRetentionDays ?? this.logRetentionDays,
    );
  }

  Map<String, Object> toJson() => {
        'updateUrl': updateUrl,
        'versionCheckUrl': versionCheckUrl,
        'autoUpdate': autoUpdate,
        'runAtStartup': runAtStartup,
        'logRetentionDays': logRetentionDays,
      };

  static AppSettings fromJson(Map<String, dynamic> json) {
    final days = json['logRetentionDays'];
    return AppSettings(
      updateUrl: _http(json['updateUrl'], defaultUpdateUrl),
      versionCheckUrl: _http(json['versionCheckUrl'], defaultVersionUrl),
      autoUpdate: json['autoUpdate'] is bool ? json['autoUpdate'] as bool : true,
      runAtStartup: json['runAtStartup'] is bool ? json['runAtStartup'] as bool : false,
      logRetentionDays: days is num ? days.toInt().clamp(1, 90) : 7,
    );
  }

  static String _http(Object? value, String fallback) {
    if (value is! String) return fallback;
    final text = value.trim();
    if (text.startsWith('https://') || text.startsWith('http://')) return text;
    return fallback;
  }
}

class SettingsStore {
  SettingsStore(this.path);

  final String path;

  Future<AppSettings> load() async {
    final file = File(path);
    if (!await file.exists()) {
      await save(AppSettings.fallback);
      return AppSettings.fallback;
    }
    try {
      final json = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
      return AppSettings.fromJson(json);
    } catch (_) {
      return AppSettings.fallback;
    }
  }

  Future<void> save(AppSettings settings) async {
    final file = File(path);
    await file.parent.create(recursive: true);
    await file.writeAsString(
      const JsonEncoder.withIndent('  ').convert(settings.toJson()),
    );
  }
}
