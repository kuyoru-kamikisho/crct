import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:http_client/parser/http_formatter.dart';
import 'package:http_client/parser/variable_interpolator.dart';
import 'package:http_client/utils/helpers.dart';

void main() {
  group('VariableInterpolator', () {
    test('replaces env vars and leaves unknown', () {
      final out = VariableInterpolator.interpolate(
        'GET {{host}}/u/{{user}}/{{missing}}',
        {'host': 'https://a.com', 'user': 'bob'},
      );
      expect(out, 'GET https://a.com/u/bob/{{missing}}');
    });

    test('supports builtins', () {
      final now = DateTime.utc(2024, 1, 2, 3, 4, 5);
      final out = VariableInterpolator.interpolate(
        r'{{$timestamp}}-{{$isoTimestamp}}-{{$randomInt}}',
        {},
        now: now,
        random: Random(1),
      );
      expect(out.contains('${now.millisecondsSinceEpoch ~/ 1000}'), isTrue);
      expect(out.contains('2024-01-02'), isTrue);
    });

    test('unresolved collects missing keys', () {
      final missing = VariableInterpolator.unresolved(r'{{a}} {{$uuid}} {{b}}', {'a': '1'});
      expect(missing, {'b'});
    });
  });

  group('HttpFormatter', () {
    test('pretty prints json body and keeps structure', () {
      const src = '''
### demo
POST https://example.com
Content-Type: application/json

{"a":1,"b":[2,3]}
''';
      final out = HttpFormatter.format(src);
      expect(out.contains('### demo'), isTrue);
      expect(out.contains('"a": 1'), isTrue);
      expect(out.contains('POST https://example.com'), isTrue);
    });
  });

  group('helpers', () {
    test('prettyJson and formatBytes', () {
      expect(prettyJson('{"a":1}').contains('\n'), isTrue);
      expect(formatBytes(500), '500 B');
      expect(formatBytes(2048), contains('KB'));
      expect(formatDuration(const Duration(milliseconds: 20)), '20 ms');
    });

    test('stripShellPrompt', () {
      expect(stripShellPrompt(r'$ curl x'), 'curl x');
      expect(stripShellPrompt(r'C:\> curl x'), 'curl x');
    });
  });
}
