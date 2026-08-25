import 'package:flutter_test/flutter_test.dart';
import 'package:http_client/parser/curl_importer.dart';

void main() {
  group('CurlImporter', () {
    test('parses bash curl with headers and json body', () {
      const curl = r'''
curl -X POST 'https://httpbin.org/post' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer tok" \
  -d '{"hello":"world"}'
''';
      final cmd = CurlImporter.parse(curl);
      expect(cmd.method, 'POST');
      expect(cmd.url, 'https://httpbin.org/post');
      expect(cmd.headers['Content-Type'], 'application/json');
      expect(cmd.headers['Authorization'], 'Bearer tok');
      expect(cmd.body, '{"hello":"world"}');

      final http = cmd.toHttp();
      expect(http.contains('POST https://httpbin.org/post'), isTrue);
      expect(http.contains('Content-Type: application/json'), isTrue);
    });

    test('parses cmd-style caret continuations', () {
      const curl = r'''
curl.exe -X GET "https://example.com/a" ^
  -H "Accept: application/json"
''';
      final cmd = CurlImporter.parse(curl);
      expect(cmd.method, 'GET');
      expect(cmd.url, 'https://example.com/a');
      expect(cmd.headers['Accept'], 'application/json');
    });

    test('defaults method to POST when -d present', () {
      final cmd = CurlImporter.parse('curl https://example.com -d a=1');
      expect(cmd.method, 'POST');
      expect(cmd.body, 'a=1');
    });

    test('supports -G to put data into query', () {
      final cmd = CurlImporter.parse('curl -G https://example.com/search -d q=hi');
      expect(cmd.method, 'GET');
      expect(cmd.url.contains('q=hi'), isTrue);
    });

    test('supports -o download and -k insecure', () {
      final cmd = CurlImporter.parse('curl -k -o out.bin https://example.com/f');
      expect(cmd.insecure, isTrue);
      expect(cmd.outputFile, 'out.bin');
      final http = cmd.toHttp();
      expect(http.contains('# @insecure'), isTrue);
      expect(http.contains('>> out.bin'), isTrue);
    });

    test('tokenizes quoted strings', () {
      final args = CurlImporter.tokenize(r'''curl -H "X: a b" 'https://x.com' ''');
      expect(args[0], 'curl');
      expect(args[1], '-H');
      expect(args[2], 'X: a b');
      expect(args[3], 'https://x.com');
    });

    test('throws on empty or non-curl', () {
      expect(() => CurlImporter.parse(''), throwsFormatException);
      expect(() => CurlImporter.parse('wget https://x.com'), throwsFormatException);
    });
  });
}
