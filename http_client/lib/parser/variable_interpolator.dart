import 'dart:math';

import '../utils/helpers.dart';

class VariableInterpolator {
  static final _pattern = RegExp(r'\{\{\s*([^}]+?)\s*\}\}');

  static String interpolate(
    String input,
    Map<String, String> env, {
    DateTime? now,
    Random? random,
  }) {
    final t = now ?? DateTime.now();
    final rng = random ?? Random();
    return input.replaceAllMapped(_pattern, (m) {
      final key = m.group(1)!.trim();
      if (key.startsWith('\$')) {
        return _builtin(key, t, rng);
      }
      if (env.containsKey(key)) return env[key]!;
      return m.group(0)!;
    });
  }

  static Set<String> unresolved(String input, Map<String, String> env) {
    final missing = <String>{};
    for (final m in _pattern.allMatches(input)) {
      final key = m.group(1)!.trim();
      if (key.startsWith('\$')) continue;
      if (!env.containsKey(key)) missing.add(key);
    }
    return missing;
  }

  static String _builtin(String key, DateTime t, Random rng) {
    switch (key) {
      case '\$uuid':
      case '\$guid':
        return randomUuid();
      case '\$timestamp':
        return '${t.millisecondsSinceEpoch ~/ 1000}';
      case '\$isoTimestamp':
        return t.toUtc().toIso8601String();
      case '\$randomInt':
        return '${rng.nextInt(1000)}';
      case '\$randomInt8':
        return '${rng.nextInt(100000000)}';
      default:
        return '{{$key}}';
    }
  }
}
