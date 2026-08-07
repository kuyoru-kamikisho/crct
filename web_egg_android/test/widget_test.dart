import 'package:flutter_test/flutter_test.dart';

import 'package:web_egg/models/app_config.dart';

void main() {
  test('AppConfig validates required fields', () {
    final empty = AppConfig();
    expect(empty.validate(), isNotNull);

    final ok = AppConfig(
      projectName: 'demo',
      projectId: 'demo-1',
      projectUrl: 'https://example.com/',
    );
    expect(ok.validate(), isNull);
  });

  test('AppConfig applyPartial updates fields', () {
    final c = AppConfig(projectName: 'a', projectId: 'b', projectUrl: 'https://a.com');
    c.applyPartial({'fullscreen': true, 'keepScreenOn': true});
    expect(c.fullscreen, isTrue);
    expect(c.keepScreenOn, isTrue);
  });
}
