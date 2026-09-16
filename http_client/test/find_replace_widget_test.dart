import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_client/models/models.dart';
import 'package:http_client/theme/app_theme.dart';
import 'package:http_client/widgets/find_replace_bar.dart';
import 'package:http_client/widgets/http_code_editor.dart';

void main() {
  testWidgets('openFind shows matches and can expand replace', (tester) async {
    final controller = HighlightEditingController(text: 'GET /foo\nGET /Foo');
    final editorKey = GlobalKey<HttpCodeEditorState>();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(dark: true),
        home: Scaffold(
          body: SizedBox(
            width: 900,
            height: 480,
            child: HttpCodeEditor(
              key: editorKey,
              controller: controller,
              document: const ParsedDocument(requests: [], lineCount: 2),
              lineStatus: const {},
              onRunLine: (_) {},
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    editorKey.currentState!.openFind();
    await tester.pumpAndSettle();

    final findField = find.descendant(
      of: find.byType(FindReplaceBar),
      matching: find.byType(TextField),
    );
    expect(findField, findsOneWidget);

    await tester.enterText(findField, 'foo');
    await tester.pumpAndSettle();
    expect(find.textContaining('1 / 2'), findsOneWidget);

    editorKey.currentState!.openFind(replace: true);
    await tester.pumpAndSettle();
    expect(find.byTooltip('替换 (Enter)'), findsOneWidget);
    expect(find.byTooltip('全部替换 (Ctrl+Alt+Enter)'), findsOneWidget);
  });
}
