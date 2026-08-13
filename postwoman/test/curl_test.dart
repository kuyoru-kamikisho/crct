import 'package:flutter_test/flutter_test.dart';
import 'package:postwoman/models/api_request.dart';
import 'package:postwoman/services/curl.dart';

void main() {
  test('parses simple GET', () {
    final req = parseCurl("curl 'https://example.com/api'");
    expect(req.method, 'GET');
    expect(req.url, 'https://example.com/api');
  });

  test('parses POST json with headers and line continuation', () {
    const raw = r'''
curl -X POST 'https://api.example.com/v1/items' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer abc' \
  --data-raw '{"name":"hi"}'
''';
    final req = parseCurl(raw);
    expect(req.method, 'POST');
    expect(req.url, 'https://api.example.com/v1/items');
    expect(req.bodyType, BodyType.json);
    expect(req.body, '{"name":"hi"}');
    expect(req.headerValue('Content-Type'), 'application/json');
    expect(req.headerValue('Authorization'), 'Bearer abc');
  });

  test('parses -XPOST attached flag and basic auth', () {
    final req = parseCurl('curl -XPOST -u user:pass https://example.com/login -d a=1&b=2');
    expect(req.method, 'POST');
    expect(req.url, 'https://example.com/login');
    expect(req.headerValue('Authorization'), isNotNull);
    expect(req.headerValue('Authorization')!.startsWith('Basic '), isTrue);
  });

  test('parses websocket url as WS', () {
    final req = parseCurl('curl "wss://echo.websocket.events"');
    expect(req.method, 'WS');
    expect(req.url, 'wss://echo.websocket.events');
    expect(req.isWebSocket, isTrue);
  });

  test('parses -k -I and --url', () {
    final req = parseCurl('curl -k -I --url https://example.com/health');
    expect(req.method, 'HEAD');
    expect(req.insecureSsl, isTrue);
    expect(req.url, 'https://example.com/health');
  });

  test('roundtrip encode then parse keeps method url and json body', () {
    final original = ApiRequest(
      method: 'PUT',
      url: 'https://example.com/x',
      bodyType: BodyType.json,
      body: '{"ok":true}',
    );
    original.ensureHeader('Accept', 'application/json');
    final curl = encodeCurl(original);
    final parsed = parseCurl(curl);
    expect(parsed.method, 'PUT');
    expect(parsed.url, 'https://example.com/x');
    expect(parsed.body.contains('"ok": true') || parsed.body.contains('"ok":true'), isTrue);
  });
}
