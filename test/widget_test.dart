import 'package:crct/widgets/time_info.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('timeinfo widget test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MaterialApp(
      home: TimeInfo(),
    ));

    // Verify that our counter starts at _:_:_.
    expect(find.text('_:_:_'), findsOneWidget);
  });
}
