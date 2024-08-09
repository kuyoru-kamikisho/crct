import 'package:http/http.dart' as http;
import 'package:server/info.dart';
import 'package:test/test.dart';

void main() {
  // test('app_welcome', () {
  //   expect(appWelcome(), true);
  // });

  test('rest_api_check', () async {
    final u1 = Uri.parse('http://localhost:8080/');
    final u2 = Uri.parse('http://localhost:8080/genId');

    final r1 = await http.get(u1);
    final r2 = await http.get(u2);

    expect(r1.body.isNotEmpty, true);
    expect(r2.body.isNotEmpty, true);
  });
}
