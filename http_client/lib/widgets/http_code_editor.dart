import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';

import '../models/models.dart';
import '../parser/http_highlighter.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/line_layout.dart';

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

          return Row(
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
