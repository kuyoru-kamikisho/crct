import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_client/theme/app_theme.dart';

void main() {
  testWidgets('themes expose zero radius and AppColors', (tester) async {
    final dark = buildAppTheme(dark: true);
    final light = buildAppTheme(dark: false);
    expect(dark.extensions[AppColors], isNotNull);
    expect(light.extensions[AppColors], isNotNull);
    expect(dark.cardTheme.shape, isA<RoundedRectangleBorder>());
    final shape = dark.cardTheme.shape as RoundedRectangleBorder;
    expect(shape.borderRadius, BorderRadius.zero);

    await tester.pumpWidget(
      MaterialApp(
        theme: light,
        darkTheme: dark,
        themeMode: ThemeMode.dark,
        home: Builder(
          builder: (context) {
            final c = AppColors.of(context);
            return Scaffold(
              body: Text('${c.play.toARGB32()}'),
            );
          },
        ),
      ),
    );
    expect(find.byType(Text), findsOneWidget);
  });
}
