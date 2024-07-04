import 'package:crct/tools/myip.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('test ip info', () async {
    var info = await queryIpInfo();
    expect(info.ip, isNotEmpty);
  });
}
