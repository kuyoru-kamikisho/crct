import 'dart:convert';
import 'dart:io';

import '../models/api_request.dart';

class HistoryItem {
  final DateTime time;
  final ApiRequest request;

  HistoryItem({required this.time, required this.request});

  String get title {
    final path = () {
      try {
        final uri = Uri.parse(request.url.trim().contains('://')
            ? request.url.trim()
            : 'https://${request.url.trim()}');
        return uri.path.isEmpty ? '/' : uri.path;
      } catch (_) {
        return request.url;
      }
    }();
    return '${request.method} $path';
  }

  Map<String, dynamic> toJson() => {
        'time': time.toIso8601String(),
        'request': request.toJson(),
      };

  factory HistoryItem.fromJson(Map<String, dynamic> json) => HistoryItem(
        time: DateTime.tryParse(json['time'] as String? ?? '') ?? DateTime.now(),
        request: ApiRequest.fromJson(
          Map<String, dynamic>.from(json['request'] as Map? ?? {}),
        ),
      );
}

class HistoryStore {
  static const _limit = 40;

  static File get _file {
    final appdata = Platform.environment['APPDATA'] ?? Directory.systemTemp.path;
    final dir = Directory('$appdata${Platform.pathSeparator}postwoman');
    if (!dir.existsSync()) {
      dir.createSync(recursive: true);
    }
    return File('${dir.path}${Platform.pathSeparator}history.json');
  }

  static Future<List<HistoryItem>> load() async {
    try {
      final file = _file;
      if (!file.existsSync()) return [];
      final raw = json.decode(await file.readAsString());
      if (raw is! List) return [];
      return raw
          .whereType<Map>()
          .map((e) => HistoryItem.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<List<HistoryItem>> add(ApiRequest request) async {
    final items = await load();
    items.insert(0, HistoryItem(time: DateTime.now(), request: request.copy()));
    if (items.length > _limit) {
      items.removeRange(_limit, items.length);
    }
    await _save(items);
    return items;
  }

  static Future<void> _save(List<HistoryItem> items) async {
    await _file.writeAsString(
      const JsonEncoder.withIndent('  ').convert(items.map((e) => e.toJson()).toList()),
    );
  }
}
