import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_client/theme/app_theme.dart';
import 'package:http_client/utils/line_layout.dart';
import 'package:http_client/widgets/http_code_editor.dart';
import 'package:http_client/models/models.dart';

void main() {
  const style = TextStyle(
    fontFamily: kEditorFontFamily,
    fontSize: kEditorFontSize,
    height: kEditorLineHeight / kEditorFontSize,
  );
  const strut = StrutStyle(
    fontFamily: kEditorFontFamily,
    fontSize: kEditorFontSize,
    height: kEditorLineHeight / kEditorFontSize,
    forceStrutHeight: true,
  );

  test('short lines keep a single visual row each', () {
    const text = 'GET /api\n\nPOST /x';
    final heights = measureLogicalLineHeights(
      text: text,
      maxWidth: 400,
      style: style,
      strutStyle: strut,
    );
    expect(heights, hasLength(3));
    expect(
      heights.every((h) => (h - kEditorLineHeight).abs() < 0.5),
      isTrue,
    );
  });

  test('long line without newline still counts as one logical line', () {
    final cookie = 'Cookie: ${'a' * 500}';
    final text = 'GET /api\n$cookie\norigin: x';
    final heights = measureLogicalLineHeights(
      text: text,
      maxWidth: 400,
      style: style,
      strutStyle: strut,
    );
    expect(heights, hasLength(3));
    expect(heights[0], closeTo(kEditorLineHeight, 0.5));
    expect(heights[1], greaterThan(kEditorLineHeight * 2));
    expect(heights[2], closeTo(kEditorLineHeight, 0.5));
  });

  test('narrower width increases wrapped line height but not line count', () {
    final line = 'Cookie: ${'token' * 80}';
    final wide = measureLogicalLineHeights(
      text: line,
      maxWidth: 800,
      style: style,
      strutStyle: strut,
    );
    final narrow = measureLogicalLineHeights(
      text: line,
      maxWidth: 120,
      style: style,
      strutStyle: strut,
    );
    expect(wide, hasLength(1));
    expect(narrow, hasLength(1));
    expect(narrow[0], greaterThan(wide[0]));
  });

  testWidgets('gutter numbers stay logical when a header wraps', (tester) async {
    final controller = HighlightEditingController(
      text: 'GET /api\nCookie: ${'x' * 80}\nHost: example.com',
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(dark: true),
        home: Scaffold(
          body: SizedBox(
            width: 280,
            height: 400,
            child: HttpCodeEditor(
              controller: controller,
              document: const ParsedDocument(requests: [], lineCount: 3),
              lineStatus: const {},
              onRunLine: (_) {},
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final gutter = tester.widget<ListView>(find.byType(ListView));
    expect(gutter.childrenDelegate.estimatedChildCount, 3);
    expect(find.text('1'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('4'), findsNothing);

    final cookieRow = tester.getSize(find.byKey(const ValueKey('gutter-1')));
    final firstRow = tester.getSize(find.byKey(const ValueKey('gutter-0')));
    expect(cookieRow.height, greaterThan(firstRow.height));
  });

  testWidgets('resizing the editor updates gutter wrap height', (tester) async {
    final controller = HighlightEditingController(
      text: 'Cookie: ${'x' * 120}',
    );

    Future<void> pumpWidth(double width) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: buildAppTheme(dark: true),
          home: Scaffold(
            body: SizedBox(
              width: width,
              height: 240,
              child: HttpCodeEditor(
                controller: controller,
                document: const ParsedDocument(requests: [], lineCount: 1),
                lineStatus: const {},
                onRunLine: (_) {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    await pumpWidth(640);
    final wide = tester.getSize(find.byKey(const ValueKey('gutter-0'))).height;

    await pumpWidth(200);
    final narrow = tester.getSize(find.byKey(const ValueKey('gutter-0'))).height;

    expect(find.text('1'), findsOneWidget);
    expect(find.text('2'), findsNothing);
    expect(narrow, greaterThan(wide));
  });
}
