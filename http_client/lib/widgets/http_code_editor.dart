import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/models.dart';
import '../parser/http_highlighter.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';

typedef RunLineCallback = void Function(int lineIndex);

class HighlightEditingController extends TextEditingController {
  HighlightEditingController({super.text});

  HighlightScheme? scheme;

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final s = scheme ?? AppColors.of(context).highlight;
    final spans = HttpHighlighter.highlight(text, s);
    if (spans.isEmpty) {
      return TextSpan(style: style, text: text);
    }

    final children = <InlineSpan>[];
    var cursor = 0;
    final events = <({int pos, bool open, HighlightSpan span})>[];
    for (final sp in spans) {
      if (sp.start >= sp.end || sp.start >= text.length) continue;
      final end = sp.end.clamp(0, text.length);
      events.add((pos: sp.start.clamp(0, text.length), open: true, span: sp));
      events.add((pos: end, open: false, span: sp));
    }
    events.sort((a, b) {
      final c = a.pos.compareTo(b.pos);
      if (c != 0) return c;
      if (a.open != b.open) return a.open ? 1 : -1;
      return 0;
    });

    final active = <HighlightSpan>[];
    for (final e in events) {
      if (e.pos > cursor) {
        children.add(_piece(text.substring(cursor, e.pos), style, active));
        cursor = e.pos;
      }
      if (e.open) {
        active.add(e.span);
      } else {
        active.remove(e.span);
      }
    }
    if (cursor < text.length) {
      children.add(_piece(text.substring(cursor), style, active));
    }
    return TextSpan(style: style, children: children);
  }

  TextSpan _piece(String t, TextStyle? base, List<HighlightSpan> active) {
    if (t.isEmpty) return const TextSpan(text: '');
    final top = active.isEmpty ? null : active.last;
    return TextSpan(
      text: t,
      style: (base ?? const TextStyle()).copyWith(
        color: top?.color ?? base?.color,
        decoration: top?.underline == true ? TextDecoration.underline : TextDecoration.none,
        decorationColor: top?.color,
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
  State<HttpCodeEditor> createState() => _HttpCodeEditorState();
}

class _HttpCodeEditorState extends State<HttpCodeEditor> {
  final ScrollController _textScroll = ScrollController();
  final ScrollController _gutterScroll = ScrollController();
  final FocusNode _focus = FocusNode();

  static const double _lineHeight = 20;
  static const double _fontSize = 13.5;

  @override
  void initState() {
    super.initState();
    _textScroll.addListener(_sync);
    widget.controller.addListener(_onChange);
  }

  void _sync() {
    if (_gutterScroll.hasClients &&
        (_gutterScroll.offset - _textScroll.offset).abs() > 0.5) {
      _gutterScroll.jumpTo(_textScroll.offset);
    }
  }

  void _onChange() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChange);
    _textScroll.removeListener(_sync);
    _textScroll.dispose();
    _gutterScroll.dispose();
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    widget.controller.scheme = colors.highlight;
    final text = widget.controller.text;
    final lineCount = text.isEmpty ? 1 : splitLines(text).length;
    final runnable = {
      for (final r in widget.document.requests) r.requestLine,
    };
    final gutterW = 70.0 + (lineCount >= 1000 ? 10 : 0);

    return Container(
      color: colors.editorBg,
      child: Row(
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
                padding: EdgeInsets.zero,
                itemCount: lineCount,
                itemExtent: _lineHeight,
                itemBuilder: (context, index) {
                  final status = widget.lineStatus[index];
                  return SizedBox(
                    height: _lineHeight,
                    child: Row(
                      children: [
                        SizedBox(
                          width: 22,
                          child: runnable.contains(index)
                              ? Tooltip(
                                  message: '运行此请求',
                                  child: Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      onTap: () => widget.onRunLine(index),
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
                                  switch (status) {
                                    RequestRunStatus.running => Icons.hourglass_top,
                                    RequestRunStatus.success => Icons.check_circle,
                                    RequestRunStatus.failure => Icons.cancel,
                                    RequestRunStatus.idle => Icons.circle_outlined,
                                  },
                                  size: 12,
                                  color: switch (status) {
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
                              fontFamily: 'Consolas',
                              fontSize: 12,
                              height: _lineHeight / 12,
                              color: colors.dimText,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                    ),
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
              maxLines: null,
              expands: true,
              keyboardType: TextInputType.multiline,
              textAlignVertical: TextAlignVertical.top,
              style: TextStyle(
                fontFamily: 'Consolas',
                fontSize: _fontSize,
                height: _lineHeight / _fontSize,
                color: colors.highlight.body,
              ),
              cursorColor: colors.accent,
              cursorWidth: 2,
              decoration: const InputDecoration(
                isCollapsed: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
                contentPadding: EdgeInsets.fromLTRB(12, 0, 12, 12),
              ),
              strutStyle: const StrutStyle(
                fontSize: _fontSize,
                height: _lineHeight / _fontSize,
                forceStrutHeight: true,
              ),
              inputFormatters: const [_TabToSpacesFormatter()],
            ),
          ),
        ],
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
