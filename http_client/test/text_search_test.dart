import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_client/utils/text_search.dart';

void main() {
  group('TextSearch.find', () {
    test('case-insensitive by default', () {
      const text = 'GET /Foo\nget /foo';
      final r = TextSearch.find(text, 'foo', const TextSearchOptions());
      expect(r.error, isNull);
      expect(r.matches.length, 2);
      expect(text.substring(r.matches[0].start, r.matches[0].end), 'Foo');
      expect(text.substring(r.matches[1].start, r.matches[1].end), 'foo');
    });

    test('case-sensitive', () {
      const text = 'GET /Foo\nget /foo';
      final r = TextSearch.find(
        text,
        'Foo',
        const TextSearchOptions(caseSensitive: true),
      );
      expect(r.matches.length, 1);
      expect(text.substring(r.matches[0].start, r.matches[0].end), 'Foo');
    });

    test('whole word', () {
      const text = 'id userId user';
      final r = TextSearch.find(
        text,
        'user',
        const TextSearchOptions(wholeWord: true),
      );
      expect(r.matches.map((m) => text.substring(m.start, m.end)).toList(), ['user']);
    });

    test('regex captures all numbers', () {
      const text = 'a1 b22 c';
      final r = TextSearch.find(
        text,
        r'\d+',
        const TextSearchOptions(regex: true),
      );
      expect(r.matches.length, 2);
      expect(text.substring(r.matches[0].start, r.matches[0].end), '1');
      expect(text.substring(r.matches[1].start, r.matches[1].end), '22');
    });

    test('invalid regex returns error', () {
      final r = TextSearch.find(
        'abc',
        r'(unclosed',
        const TextSearchOptions(regex: true),
      );
      expect(r.hasError, isTrue);
      expect(r.matches, isEmpty);
    });

    test('empty query matches nothing', () {
      final r = TextSearch.find('abc', '', const TextSearchOptions());
      expect(r.matches, isEmpty);
      expect(r.error, isNull);
    });

    test('literal query escapes regex metacharacters', () {
      const text = 'a.txt and aXtxt';
      final r = TextSearch.find(text, 'a.txt', const TextSearchOptions());
      expect(r.matches.length, 1);
    });
  });

  group('TextSearch navigation', () {
    test('nextIndex wraps', () {
      const matches = [
        TextSearchMatch(0, 1),
        TextSearchMatch(2, 3),
        TextSearchMatch(4, 5),
      ];
      expect(TextSearch.nextIndex(matches, 2, forward: true), 0);
      expect(TextSearch.nextIndex(matches, 0, forward: false), 2);
    });

    test('indexFromCaret finds next or previous', () {
      const matches = [
        TextSearchMatch(0, 2),
        TextSearchMatch(10, 12),
        TextSearchMatch(20, 22),
      ];
      expect(TextSearch.indexFromCaret(matches, 10, forward: true), 1);
      expect(TextSearch.indexFromCaret(matches, 11, forward: true), 2);
      expect(TextSearch.indexFromCaret(matches, 21, forward: false), 1);
      expect(TextSearch.indexFromCaret(matches, 0, forward: false), 2);
    });
  });

  group('TextSearch.replace', () {
    test('replace current once', () {
      const text = 'foo bar foo';
      final match = TextSearchMatch(0, 3);
      final out = TextSearch.replaceCurrent(
        text: text,
        query: 'foo',
        replacement: 'baz',
        match: match,
        options: const TextSearchOptions(),
      );
      expect(out.text, 'baz bar foo');
      expect(out.caret, 3);
    });

    test('replace all', () {
      final out = TextSearch.replaceAll(
        text: 'foo bar foo',
        query: 'foo',
        replacement: 'baz',
        options: const TextSearchOptions(),
      );
      expect(out.text, 'baz bar baz');
      expect(out.count, 2);
    });

    test('regex replace with capture groups', () {
      final out = TextSearch.replaceAll(
        text: 'GET /users/1  GET /users/2',
        query: r'/users/(\d+)',
        replacement: r'/accounts/$1',
        options: const TextSearchOptions(regex: true),
      );
      expect(out.text, 'GET /accounts/1  GET /accounts/2');
      expect(out.count, 2);
    });

    test('preserve case', () {
      expect(TextSearch.preserveCase('FOO', 'Bar'), 'BAR');
      expect(TextSearch.preserveCase('foo', 'Bar'), 'bar');
      expect(TextSearch.preserveCase('Foo', 'bar'), 'Bar');
    });

    test('replace all with preserve case', () {
      final out = TextSearch.replaceAll(
        text: 'Foo foo FOO',
        query: 'foo',
        replacement: 'bar',
        options: const TextSearchOptions(preserveCase: true),
      );
      expect(out.text, 'Bar bar BAR');
    });
  });

  group('pasteIntoEditingValue', () {
    test('replaces selection and converts tabs', () {
      const value = TextEditingValue(
        text: 'abXXXcd',
        selection: TextSelection(baseOffset: 2, extentOffset: 5),
      );
      final next = pasteIntoEditingValue(value, 'Q\tR');
      expect(next.text, 'abQ  Rcd');
      expect(next.selection.baseOffset, 6);
    });

    test('appends when selection is invalid', () {
      const value = TextEditingValue(text: 'ab');
      final next = pasteIntoEditingValue(value, 'c');
      expect(next.text, 'abc');
      expect(next.selection.isCollapsed, isTrue);
      expect(next.selection.baseOffset, 3);
    });
  });
}
