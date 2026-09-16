import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';

import '../models/models.dart';
import '../parser/http_highlighter.dart';
import '../services/system_paste.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/line_layout.dart';
import '../utils/text_search.dart';
import 'find_replace_bar.dart';

typedef RunLineCallback = void Function(int lineIndex);

class HighlightEditingController extends TextEditingController {
  HighlightEditingController({super.text});

  HighlightScheme? scheme;
  List<TextRange> searchMatches = const [];
  int activeSearchIndex = -1;
  Color searchMatchColor = const Color(0x665E7E2A);
  Color activeSearchMatchColor = const Color(0x99C9A227);

  void setSearchHighlights(List<TextRange> matches, int activeIndex) {
    if (_sameHighlights(matches, activeIndex)) return;
    searchMatches = List<TextRange>.unmodifiable(matches);
    activeSearchIndex = activeIndex;
    notifyListeners();
  }

  void clearSearchHighlights() {
    if (searchMatches.isEmpty && activeSearchIndex < 0) return;
    searchMatches = const [];
    activeSearchIndex = -1;
    notifyListeners();
  }

  bool _sameHighlights(List<TextRange> matches, int activeIndex) {
    if (activeIndex != activeSearchIndex) return false;
    if (matches.length != searchMatches.length) return false;
    for (var i = 0; i < matches.length; i++) {
      if (matches[i].start != searchMatches[i].start ||
          matches[i].end != searchMatches[i].end) {
        return false;
      }
    }
    return true;
  }

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final s = scheme ?? AppColors.of(context).highlight;
    final spans = HttpHighlighter.highlight(text, s);
    if (spans.isEmpty && searchMatches.isEmpty) {
      return TextSpan(style: style, text: text);
    }

    final children = <InlineSpan>[];
    var cursor = 0;
    final events = <({int pos, int order, bool open, HighlightSpan? span, Color? bg})>[];
    for (final sp in spans) {
      if (sp.start >= sp.end || sp.start >= text.length) continue;
      final end = sp.end.clamp(0, text.length);
      events.add((pos: sp.start.clamp(0, text.length), order: 1, open: true, span: sp, bg: null));
      events.add((pos: end, order: 0, open: false, span: sp, bg: null));
    }
    for (var i = 0; i < searchMatches.length; i++) {
      final m = searchMatches[i];
      if (m.start >= m.end) continue;
      final start = m.start.clamp(0, text.length);
      final end = m.end.clamp(0, text.length);
      if (start >= end) continue;
      final bg = i == activeSearchIndex ? activeSearchMatchColor : searchMatchColor;
      events.add((pos: start, order: 1, open: true, span: null, bg: bg));
      events.add((pos: end, order: 0, open: false, span: null, bg: bg));
    }
    events.sort((a, b) {
      final c = a.pos.compareTo(b.pos);
      if (c != 0) return c;
      return a.order.compareTo(b.order);
    });

    final active = <HighlightSpan>[];
    final searchStack = <Color>[];
    for (final e in events) {
      if (e.pos > cursor) {
        children.add(_piece(
          text.substring(cursor, e.pos),
          style,
          active,
          searchStack.isEmpty ? null : searchStack.last,
        ));
        cursor = e.pos;
      }
      if (e.span != null) {
        if (e.open) {
          active.add(e.span!);
        } else {
          active.remove(e.span);
        }
      } else if (e.bg != null) {
        if (e.open) {
          searchStack.add(e.bg!);
        } else {
          final idx = searchStack.lastIndexOf(e.bg!);
          if (idx >= 0) searchStack.removeAt(idx);
        }
      }
    }
    if (cursor < text.length) {
      children.add(_piece(
        text.substring(cursor),
        style,
        active,
        searchStack.isEmpty ? null : searchStack.last,
      ));
    }
    return TextSpan(style: style, children: children);
  }

  TextSpan _piece(String t, TextStyle? base, List<HighlightSpan> active, Color? bg) {
    if (t.isEmpty) return const TextSpan(text: '');
    final top = active.isEmpty ? null : active.last;
    return TextSpan(
      text: t,
      style: (base ?? const TextStyle()).copyWith(
        color: top?.color ?? base?.color,
        decoration: top?.underline == true ? TextDecoration.underline : TextDecoration.none,
        decorationColor: top?.color,
        backgroundColor: bg,
      ),
    );
  }
}

class HttpCodeEditor extends StatefulWidget {
  const HttpCodeEditor({
    super.key,
    required this.controller,
    required this.document,
    required this.lineStatus,
    required this.onRunLine,
  });

  final HighlightEditingController controller;
  final ParsedDocument document;
  final Map<int, RequestRunStatus> lineStatus;
  final RunLineCallback onRunLine;

  @override
  HttpCodeEditorState createState() => HttpCodeEditorState();
}

class HttpCodeEditorState extends State<HttpCodeEditor> {
  final ScrollController _textScroll = ScrollController();
  final ScrollController _gutterScroll = ScrollController();
  final FocusNode _focus = FocusNode();
  final TextEditingController _findController = TextEditingController();
  final TextEditingController _replaceController = TextEditingController();
  final FocusNode _findFocus = FocusNode();
  final FocusNode _replaceFocus = FocusNode();

  bool _findVisible = false;
  bool _replaceMode = false;
  TextSearchOptions _options = const TextSearchOptions();
  List<TextSearchMatch> _matches = const [];
  int _currentIndex = -1;
  String? _searchError;
  String _lastSearchText = '';

  static const TextStyle _baseStyle = TextStyle(
    fontFamily: kEditorFontFamily,
    fontSize: kEditorFontSize,
    height: kEditorLineHeight / kEditorFontSize,
  );

  static const StrutStyle _strut = StrutStyle(
    fontFamily: kEditorFontFamily,
    fontSize: kEditorFontSize,
    height: kEditorLineHeight / kEditorFontSize,
    forceStrutHeight: true,
  );

  List<double> _lineHeights = const [kEditorLineHeight];
  String _measuredText = '';
  double _measuredWidth = -1;
  double _measuredScaler = -1;

  @override
  void initState() {
    super.initState();
    _textScroll.addListener(_sync);
    widget.controller.addListener(_onChange);
    _focus.addListener(_onEditorFocus);
    _lastSearchText = widget.controller.text;
  }

  void _onEditorFocus() {
    if (_focus.hasFocus) {
      SystemPaste.remember(widget.controller, _focus);
    }
  }

  void openFind({bool replace = false}) {
    final selection = widget.controller.selection;
    final text = widget.controller.text;
    if (selection.isValid && !selection.isCollapsed) {
      final start = selection.start.clamp(0, text.length);
      final end = selection.end.clamp(0, text.length);
      final lo = start < end ? start : end;
      final hi = start < end ? end : start;
      final selected = text.substring(lo, hi);
      if (selected.isNotEmpty && !selected.contains('\n')) {
        _findController.value = TextEditingValue(
          text: selected,
          selection: TextSelection(baseOffset: 0, extentOffset: selected.length),
        );
      }
    }
    final focusReplace = replace && _findController.text.isNotEmpty;
    setState(() {
      _findVisible = true;
      if (replace) _replaceMode = true;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (focusReplace) {
        _replaceFocus.requestFocus();
      } else {
        _findFocus.requestFocus();
        _findController.selection = TextSelection(
          baseOffset: 0,
          extentOffset: _findController.text.length,
        );
      }
      _runSearch(selectMatch: true);
    });
  }

  void findNext() {
    if (!_findVisible) {
      openFind();
      return;
    }
    _moveMatch(forward: true);
  }

  void findPrevious() {
    if (!_findVisible) {
      openFind();
      return;
    }
    _moveMatch(forward: false);
  }

  void _closeFind() {
    setState(() {
      _findVisible = false;
      _replaceMode = false;
      _matches = const [];
      _currentIndex = -1;
      _searchError = null;
    });
    widget.controller.clearSearchHighlights();
    _focus.requestFocus();
  }

  void _runSearch({required bool selectMatch, int? caret}) {
    final result = TextSearch.find(widget.controller.text, _findController.text, _options);
    if (!mounted) return;
    setState(() {
      _searchError = result.error;
      _matches = result.matches;
      if (_matches.isEmpty) {
        _currentIndex = -1;
      } else if (selectMatch) {
        final from = caret ?? widget.controller.selection.extentOffset;
        _currentIndex = TextSearch.indexFromCaret(_matches, from, forward: true);
      } else if (_currentIndex >= _matches.length) {
        _currentIndex = _matches.length - 1;
      }
    });
    widget.controller.setSearchHighlights(
      [for (final m in _matches) TextRange(start: m.start, end: m.end)],
      _currentIndex,
    );
    if (selectMatch && _currentIndex >= 0) {
      _selectCurrentMatch();
    }
  }

  void _moveMatch({required bool forward}) {
    if (_matches.isEmpty) {
      _runSearch(selectMatch: true);
      return;
    }
    setState(() {
      _currentIndex = TextSearch.nextIndex(_matches, _currentIndex, forward: forward);
    });
    widget.controller.setSearchHighlights(
      [for (final m in _matches) TextRange(start: m.start, end: m.end)],
      _currentIndex,
    );
    _selectCurrentMatch();
  }

  void _selectCurrentMatch() {
    if (_currentIndex < 0 || _currentIndex >= _matches.length) return;
    final m = _matches[_currentIndex];
    widget.controller.selection = TextSelection(baseOffset: m.start, extentOffset: m.end);
  }

  void _replaceCurrent() {
    if (_findController.text.isEmpty || _matches.isEmpty || _currentIndex < 0) return;
    final match = _matches[_currentIndex];
    final result = TextSearch.replaceCurrent(
      text: widget.controller.text,
      query: _findController.text,
      replacement: _replaceController.text,
      match: match,
      options: _options,
    );
    widget.controller.value = TextEditingValue(
      text: result.text,
      selection: TextSelection.collapsed(offset: result.caret),
    );
    _runSearch(selectMatch: true, caret: result.caret);
  }

  void _replaceAll() {
    if (_findController.text.isEmpty) return;
    final result = TextSearch.replaceAll(
      text: widget.controller.text,
      query: _findController.text,
      replacement: _replaceController.text,
      options: _options,
    );
    if (result.count == 0) return;
    widget.controller.value = TextEditingValue(
      text: result.text,
      selection: TextSelection.collapsed(offset: result.text.length.clamp(0, result.text.length)),
    );
    _runSearch(selectMatch: false);
  }

  void _sync() {
    if (!_gutterScroll.hasClients || !_textScroll.hasClients) return;
    final target = _textScroll.offset.clamp(
      _gutterScroll.position.minScrollExtent,
      _gutterScroll.position.maxScrollExtent,
    );
    if ((_gutterScroll.offset - target).abs() > 0.5) {
      _gutterScroll.jumpTo(target);
    }
  }

  void _onChange() {
    if (widget.controller.text != _lastSearchText) {
      _lastSearchText = widget.controller.text;
      if (_findVisible) {
        _runSearch(selectMatch: false);
      }
    }
    if (mounted) setState(() {});
  }

  bool _sameHeights(List<double> a, List<double> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if ((a[i] - b[i]).abs() > 0.5) return false;
    }
    return true;
  }

  List<double> _heightsFor(String text, double maxWidth, TextScaler scaler) {
    final sf = scaler.scale(kEditorFontSize);
    if (text == _measuredText &&
        (maxWidth - _measuredWidth).abs() < 0.5 &&
        sf == _measuredScaler &&
        _lineHeights.isNotEmpty) {
      return _lineHeights;
    }
    _measuredText = text;
    _measuredWidth = maxWidth;
    _measuredScaler = sf;
    _lineHeights = measureLogicalLineHeights(
      text: text,
      maxWidth: maxWidth,
      style: _baseStyle,
      strutStyle: _strut,
      textScaler: scaler,
    );
    return _lineHeights;
  }

  /// 用实际 RenderEditable 的折行盒子校正 gutter 高度，避免测量与绘制不一致。
  void _refineHeightsFromRender() {
    final ro = _focus.context?.findRenderObject();
    if (ro is! RenderEditable || !ro.hasSize) return;

    final text = widget.controller.text;
    final ranges = logicalLineRanges(text);
    final maxOffset = text.length;
    final heights = <double>[];

    for (final r in ranges) {
      final start = r.start.clamp(0, maxOffset);
      final end = r.end.clamp(0, maxOffset);
      final boxes = ro.getBoxesForSelection(
        end > start
            ? TextSelection(baseOffset: start, extentOffset: end)
            : TextSelection.collapsed(offset: start),
      );
      if (boxes.isEmpty) {
        heights.add(kEditorLineHeight);
      } else {
        final h = boxes.last.bottom - boxes.first.top;
        heights.add(h < kEditorLineHeight ? kEditorLineHeight : h);
      }
    }

    if (!_sameHeights(heights, _lineHeights)) {
      setState(() {
        _lineHeights = heights;
        _measuredText = text;
      });
    }
    _sync();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChange);
    _textScroll.removeListener(_sync);
    _focus.removeListener(_onEditorFocus);
    _textScroll.dispose();
    _gutterScroll.dispose();
    _focus.dispose();
    _findController.dispose();
    _replaceController.dispose();
    _findFocus.dispose();
    _replaceFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    widget.controller.scheme = colors.highlight;
    final dark = Theme.of(context).brightness == Brightness.dark;
    widget.controller.searchMatchColor =
        dark ? const Color(0x665E7E2A) : const Color(0x66E8C547);
    widget.controller.activeSearchMatchColor =
        dark ? const Color(0x99C9A227) : const Color(0x99F0A100);
    final text = widget.controller.text;
    final lineCount = text.isEmpty ? 1 : splitLines(text).length;
    final runnable = {
      for (final r in widget.document.requests) r.requestLine,
    };
    final gutterW = 70.0 + (lineCount >= 1000 ? 10 : 0);
    final scaler = MediaQuery.textScalerOf(context);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _refineHeightsFromRender();
    });

    return Container(
      color: colors.editorBg,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final textMaxWidth = (constraints.maxWidth -
                  gutterW -
                  kEditorContentPadding.horizontal)
              .clamp(0.0, double.infinity);
          final lineHeights = _heightsFor(text, textMaxWidth, scaler);

          return Stack(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: gutterW,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: colors.gutterBg,
                        border: Border(right: BorderSide(color: colors.border)),
                      ),
                      child: ListView.builder(
                        controller: _gutterScroll,
                        physics: const NeverScrollableScrollPhysics(),
                        padding: EdgeInsets.only(
                          bottom: kEditorContentPadding.bottom,
                        ),
                        itemCount: lineCount,
                        itemExtentBuilder: (index, _) =>
                            index < lineHeights.length
                                ? lineHeights[index]
                                : kEditorLineHeight,
                        itemBuilder: (context, index) {
                          final status = widget.lineStatus[index];
                          final height = index < lineHeights.length
                              ? lineHeights[index]
                              : kEditorLineHeight;
                          return _GutterLine(
                            key: ValueKey('gutter-$index'),
                            index: index,
                            height: height,
                            runnable: runnable.contains(index),
                            status: status,
                            colors: colors,
                            onRun: () => widget.onRunLine(index),
                          );
                        },
                      ),
                    ),
                  ),
                  Expanded(
                    child: TextField(
                      controller: widget.controller,
                      focusNode: _focus,
                      scrollController: _textScroll,
                      autofocus: true,
                      maxLines: null,
                      expands: true,
                      keyboardType: TextInputType.multiline,
                      textAlignVertical: TextAlignVertical.top,
                      style: _baseStyle.copyWith(color: colors.highlight.body),
                      cursorColor: colors.accent,
                      cursorWidth: 2,
                      decoration: const InputDecoration(
                        isCollapsed: true,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: false,
                        contentPadding: kEditorContentPadding,
                      ),
                      strutStyle: _strut,
                      inputFormatters: const [_TabToSpacesFormatter()],
                    ),
                  ),
                ],
              ),
              if (_findVisible)
                Positioned(
                  top: 6,
                  right: 18,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: (constraints.maxWidth - 28).clamp(280.0, 520.0),
                    ),
                    child: FindReplaceBar(
                      findController: _findController,
                      replaceController: _replaceController,
                      findFocus: _findFocus,
                      replaceFocus: _replaceFocus,
                      replaceMode: _replaceMode,
                      options: _options,
                      matchCount: _matches.length,
                      currentIndex: _currentIndex,
                      error: _searchError,
                      onToggleReplace: () => setState(() => _replaceMode = !_replaceMode),
                      onOptionsChanged: (o) {
                        setState(() => _options = o);
                        _runSearch(selectMatch: true);
                      },
                      onQueryChanged: () => _runSearch(selectMatch: true),
                      onNext: () => _moveMatch(forward: true),
                      onPrevious: () => _moveMatch(forward: false),
                      onReplace: _replaceCurrent,
                      onReplaceAll: _replaceAll,
                      onClose: _closeFind,
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _GutterLine extends StatelessWidget {
  const _GutterLine({
    super.key,
    required this.index,
    required this.height,
    required this.runnable,
    required this.status,
    required this.colors,
    required this.onRun,
  });

  final int index;
  final double height;
  final bool runnable;
  final RequestRunStatus? status;
  final AppColors colors;
  final VoidCallback onRun;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: Align(
        alignment: Alignment.topCenter,
        child: SizedBox(
          height: kEditorLineHeight,
          child: Row(
            children: [
              SizedBox(
                width: 22,
                child: runnable
                    ? Tooltip(
                        message: '运行此请求',
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: onRun,
                            child: Icon(
                              Icons.play_arrow,
                              size: 16,
                              color: colors.play,
                            ),
                          ),
                        ),
                      )
                    : null,
              ),
              SizedBox(
                width: 14,
                child: status == null
                    ? null
                    : Icon(
                        switch (status!) {
                          RequestRunStatus.running => Icons.hourglass_top,
                          RequestRunStatus.success => Icons.check_circle,
                          RequestRunStatus.failure => Icons.cancel,
                          RequestRunStatus.idle => Icons.circle_outlined,
                        },
                        size: 12,
                        color: switch (status!) {
                          RequestRunStatus.success => colors.success,
                          RequestRunStatus.failure => colors.danger,
                          RequestRunStatus.running => colors.warning,
                          RequestRunStatus.idle => colors.dimText,
                        },
                      ),
              ),
              Expanded(
                child: Text(
                  '${index + 1}',
                  textAlign: TextAlign.right,
                  style: TextStyle(
                    fontFamily: kEditorFontFamily,
                    fontSize: 12,
                    height: kEditorLineHeight / 12,
                    color: colors.dimText,
                  ),
                ),
              ),
              const SizedBox(width: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class _TabToSpacesFormatter extends TextInputFormatter {
  const _TabToSpacesFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (!newValue.text.contains('\t')) return newValue;
    final replaced = newValue.text.replaceAll('\t', '  ');
    final delta = replaced.length - newValue.text.length;
    return TextEditingValue(
      text: replaced,
      selection: TextSelection.collapsed(
        offset: (newValue.selection.baseOffset + delta).clamp(0, replaced.length),
      ),
    );
  }
}
