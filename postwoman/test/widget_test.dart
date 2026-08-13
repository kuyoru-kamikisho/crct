import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:postwoman/main.dart';

void main() {
  testWidgets('shows send controls', (tester) async {
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const PostwomanApp());
    expect(find.text('发送'), findsOneWidget);
    expect(find.text('导入 curl'), findsOneWidget);
    expect(find.text('Postwoman'), findsOneWidget);
  });
}
