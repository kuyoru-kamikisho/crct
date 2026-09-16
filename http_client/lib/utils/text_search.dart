import 'package:flutter/services.dart';

class TextSearchOptions {
  const TextSearchOptions({
    this.caseSensitive = false,
    this.wholeWord = false,
    this.regex = false,
    this.preserveCase = false,
  });

  final bool caseSensitive;
  final bool wholeWord;
  final bool regex;
  final bool preserveCase;

  TextSearchOptions copyWith({
    bool? caseSensitive,
    bool? wholeWord,
    bool? regex,
    bool? preserveCase,
  }) {
    return TextSearchOptions(
      caseSensitive: caseSensitive ?? this.caseSensitive,
      wholeWord: wholeWord ?? this.wholeWord,
      regex: regex ?? this.regex,
      preserveCase: preserveCase ?? this.preserveCase,
    );
  }
}

class TextSearchMatch {
  const TextSearchMatch(this.start, this.end);
  final int start;
  final int end;
  int get length => end - start;
}

class TextSearchResult {
  const TextSearchResult({this.matches = const [], this.error});
  final List<TextSearchMatch> matches;
  final String? error;
  bool get hasError => error != null;
}

class TextSearch {
  TextSearch._();

  static const int maxMatches = 20000;

  static TextSearchResult find(
    String text,
    String query,
    TextSearchOptions options,
  ) {
    if (query.isEmpty) return const TextSearchResult();
    final compiled = _compile(query, options);
    if (compiled.error != null) {
      return TextSearchResult(error: compiled.error);
    }
    final re = compiled.regex!;
    final matches = <TextSearchMatch>[];
    for (final m in re.allMatches(text)) {
      matches.add(TextSearchMatch(m.start, m.end));
      if (matches.length >= maxMatches) break;
    }
    return TextSearchResult(matches: matches);
  }

  static int nextIndex(List<TextSearchMatch> matches, int current, {required bool forward}) {
    if (matches.isEmpty) return -1;
    if (current < 0) return 0;
    if (forward) return (current + 1) % matches.length;
    return (current - 1 + matches.length) % matches.length;
  }

  /// 从 [caret] 起找下一个匹配；没有则从文档开头/末尾环绕。
  static int indexFromCaret(
    List<TextSearchMatch> matches,
    int caret, {
    required bool forward,
  }) {
    if (matches.isEmpty) return -1;
    if (forward) {
      for (var i = 0; i < matches.length; i++) {
        if (matches[i].start >= caret) return i;
      }
      return 0;
    }
    for (var i = matches.length - 1; i >= 0; i--) {
      if (matches[i].end <= caret) return i;
    }
    return matches.length - 1;
  }

  static String expandRegexReplacement(String template, Match match) {
    final buf = StringBuffer();
    for (var i = 0; i < template.length; i++) {
      final ch = template[i];
      if (ch != r'$' || i + 1 >= template.length) {
        buf.write(ch);
        continue;
      }
      final next = template[i + 1];
      if (next == r'$') {
        buf.write(r'$');
        i++;
        continue;
      }
      if (next == '&' || next == '0') {
        buf.write(match[0] ?? '');
        i++;
        continue;
      }
      var j = i + 1;
      while (j < template.length) {
        final code = template.codeUnitAt(j);
        if (code < 48 || code > 57) break;
        j++;
      }
      if (j == i + 1) {
        buf.write(ch);
        continue;
      }
      final idx = int.parse(template.substring(i + 1, j));
      if (idx <= match.groupCount) {
        buf.write(match.group(idx) ?? '');
      }
      i = j - 1;
    }
    return buf.toString();
  }

  static String preserveCase(String source, String replacement) {
    if (source.isEmpty || replacement.isEmpty) return replacement;
    final hasLetter = source.runes.any(_isLetter);
    if (!hasLetter) return replacement;
    if (source == source.toUpperCase()) return replacement.toUpperCase();
    if (source == source.toLowerCase()) return replacement.toLowerCase();
    if (source[0] == source[0].toUpperCase() &&
        source.substring(1) == source.substring(1).toLowerCase()) {
      final rest = replacement.length > 1 ? replacement.substring(1).toLowerCase() : '';
      return replacement[0].toUpperCase() + rest;
    }
    return replacement;
  }

  static ({String text, int caret}) replaceCurrent({
    required String text,
    required String query,
    required String replacement,
    required TextSearchMatch match,
    required TextSearchOptions options,
  }) {
    final compiled = _compile(query, options);
    if (compiled.error != null || compiled.regex == null) {
      return (text: text, caret: match.end);
    }
    final piece = text.substring(match.start, match.end);
    final m = compiled.regex!.matchAsPrefix(text, match.start);
    var inserted = replacement;
    if (options.regex && m != null && m.start == match.start && m.end == match.end) {
      inserted = expandRegexReplacement(replacement, m);
    }
    if (options.preserveCase) {
      inserted = preserveCase(piece, inserted);
    }
    final next = text.replaceRange(match.start, match.end, inserted);
    return (text: next, caret: match.start + inserted.length);
  }

  static ({String text, int count}) replaceAll({
    required String text,
    required String query,
    required String replacement,
    required TextSearchOptions options,
  }) {
    if (query.isEmpty) return (text: text, count: 0);
    final compiled = _compile(query, options);
    if (compiled.error != null || compiled.regex == null) {
      return (text: text, count: 0);
    }
    final re = compiled.regex!;
    final buf = StringBuffer();
    var last = 0;
    var count = 0;
    for (final m in re.allMatches(text)) {
      buf.write(text.substring(last, m.start));
      var inserted = options.regex ? expandRegexReplacement(replacement, m) : replacement;
      if (options.preserveCase) {
        inserted = preserveCase(m[0] ?? '', inserted);
      }
      buf.write(inserted);
      last = m.end;
      count++;
      if (count >= maxMatches) break;
    }
    buf.write(text.substring(last));
    return (text: buf.toString(), count: count);
  }

  static ({RegExp? regex, String? error}) _compile(
    String query,
    TextSearchOptions options,
  ) {
    var pattern = options.regex ? query : RegExp.escape(query);
    if (options.wholeWord) {
      pattern = '\\b(?:$pattern)\\b';
    }
    try {
      return (
        regex: RegExp(
          pattern,
          caseSensitive: options.caseSensitive,
          multiLine: true,
          unicode: true,
        ),
        error: null,
      );
    } on FormatException catch (e) {
      return (regex: null, error: e.message.isEmpty ? '无效正则表达式' : e.message);
    }
  }

  static bool _isLetter(int rune) {
    return (rune >= 0x41 && rune <= 0x5A) ||
        (rune >= 0x61 && rune <= 0x7A) ||
        (rune >= 0xC0 && rune <= 0x24F) ||
        rune > 0x7F;
  }
}

TextEditingValue pasteIntoEditingValue(TextEditingValue value, String paste) {
  final text = paste.replaceAll('\t', '  ');
  if (!value.selection.isValid) {
    return TextEditingValue(
      text: value.text + text,
      selection: TextSelection.collapsed(offset: value.text.length + text.length),
    );
  }
  var start = value.selection.start;
  var end = value.selection.end;
  if (start > end) {
    final tmp = start;
    start = end;
    end = tmp;
  }
  start = start.clamp(0, value.text.length);
  end = end.clamp(0, value.text.length);
  final next = value.text.replaceRange(start, end, text);
  return TextEditingValue(
    text: next,
    selection: TextSelection.collapsed(offset: start + text.length),
  );
}
