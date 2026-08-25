import 'package:flutter_test/flutter_test.dart';
import 'package:http_client/parser/http_file_parser.dart';

void main() {
  test('smoke: examples asset format is parseable', () {
    const sample = '''
### GET with environment
GET {{host}}/get
Accept: application/json

###
POST {{host}}/post
Content-Type: application/json

{"a":1}
''';
    final doc = HttpFileParser.parse(sample);
    expect(doc.requests.length, greaterThanOrEqualTo(2));
  });
}
