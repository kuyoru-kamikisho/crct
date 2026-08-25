import 'package:flutter_test/flutter_test.dart';
import 'package:http_client/parser/http_file_parser.dart';
import 'package:http_client/models/models.dart';

void main() {
  group('HttpFileParser', () {
    test('parses multiple requests separated by ###', () {
      const src = '''
### first
GET https://example.com/a
Accept: application/json

### second
POST https://example.com/b
Content-Type: application/json

{"x":1}
''';
      final doc = HttpFileParser.parse(src);
      expect(doc.requests.length, 2);
      expect(doc.requests[0].method, 'GET');
      expect(doc.requests[0].url, 'https://example.com/a');
      expect(doc.requests[0].headers['Accept'], 'application/json');
      expect(doc.requests[0].name, 'first');
      expect(doc.requests[1].method, 'POST');
      expect(doc.requests[1].body.contains('"x"'), isTrue);
    });

    test('detects websocket and sse kinds', () {
      const src = '''
### ws
WEBSOCKET wss://echo.example/ws

hello

### sse
SSE https://example.com/events
Accept: text/event-stream
''';
      final doc = HttpFileParser.parse(src);
      expect(doc.requests[0].kind, RequestKind.websocket);
      expect(doc.requests[1].kind, RequestKind.sse);
    });

    test('detects download via >> and annotation', () {
      const src = '''
### dl
# @download
GET https://example.com/file.bin
>> out.bin
''';
      final doc = HttpFileParser.parse(src);
      expect(doc.requests.single.kind, RequestKind.download);
      expect(doc.requests.single.outputFile, 'out.bin');
    });

    test('supports multi-line query and graphql', () {
      const src = '''
GET https://example.com/search
    ?q=flutter
    &page=1

###
GRAPHQL https://api.example/graphql
Content-Type: application/json

{ "query": "{ hi }" }
''';
      final doc = HttpFileParser.parse(src);
      expect(doc.requests.length, 2);
      expect(doc.requests[0].composedUrl.contains('q=flutter'), isTrue);
      expect(doc.requests[1].kind, RequestKind.graphql);
    });

    test('atLine finds surrounding request', () {
      const src = '''
### a
GET https://a.com

### b
POST https://b.com
''';
      final doc = HttpFileParser.parse(src);
      expect(doc.atLine(doc.requests[0].requestLine)?.method, 'GET');
      expect(doc.atLine(doc.requests[1].requestLine)?.method, 'POST');
    });
  });
}
