import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';
import '../utils/text_search.dart';

class FindReplaceBar extends StatelessWidget {
  const FindReplaceBar({
    super.key,
    required this.findController,
    required this.replaceController,
    required this.findFocus,
    required this.replaceFocus,
    required this.replaceMode,
    required this.options,
    required this.matchCount,
    required this.currentIndex,
    required this.error,
    required this.onToggleReplace,
    required this.onOptionsChanged,
    required this.onQueryChanged,
    required this.onNext,
    required this.onPrevious,
    required this.onReplace,
    required this.onReplaceAll,
    required this.onClose,
  });

  final TextEditingController findController;
  final TextEditingController replaceController;
  final FocusNode findFocus;
  final FocusNode replaceFocus;
  final bool replaceMode;
  final TextSearchOptions options;
  final int matchCount;
  final int currentIndex;
  final String? error;
  final VoidCallback onToggleReplace;
  final ValueChanged<TextSearchOptions> onOptionsChanged;
  final VoidCallback onQueryChanged;
  final VoidCallback onNext;
  final VoidCallback onPrevious;
  final VoidCallback onReplace;
  final VoidCallback onReplaceAll;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final countLabel = error != null
        ? '无效正则'
        : findController.text.isEmpty
            ? ''
            : (matchCount == 0
                ? '无结果'
                : '${currentIndex + 1} / $matchCount');

    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.escape): onClose,
        const SingleActivator(LogicalKeyboardKey.enter): () {
          if (replaceFocus.hasFocus) {
            onReplace();
          } else {
            onNext();
          }
        },
        const SingleActivator(LogicalKeyboardKey.enter, shift: true): onPrevious,
        const SingleActivator(LogicalKeyboardKey.f3): onNext,
        const SingleActivator(LogicalKeyboardKey.f3, shift: true): onPrevious,
        const SingleActivator(LogicalKeyboardKey.enter, control: true, alt: true):
            onReplaceAll,
        const SingleActivator(LogicalKeyboardKey.keyC, alt: true): () =>
            onOptionsChanged(options.copyWith(caseSensitive: !options.caseSensitive)),
        const SingleActivator(LogicalKeyboardKey.keyW, alt: true): () =>
            onOptionsChanged(options.copyWith(wholeWord: !options.wholeWord)),
        const SingleActivator(LogicalKeyboardKey.keyR, alt: true): () =>
            onOptionsChanged(options.copyWith(regex: !options.regex)),
        const SingleActivator(LogicalKeyboardKey.keyP, alt: true): () =>
            onOptionsChanged(options.copyWith(preserveCase: !options.preserveCase)),
      },
      child: Material(
        color: colors.panelBg,
        elevation: 8,
        child: Container(
          decoration: BoxDecoration(
            color: colors.panelBg,
            border: Border.all(color: colors.border),
          ),
          padding: const EdgeInsets.fromLTRB(4, 6, 4, 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IconButton(
                tooltip: replaceMode ? '隐藏替换' : '显示替换 (Ctrl+H)',
                onPressed: onToggleReplace,
                visualDensity: VisualDensity.compact,
                icon: Icon(
                  replaceMode ? Icons.expand_more : Icons.chevron_right,
                  size: 18,
                  color: colors.dimText,
                ),
              ),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: findController,
                            focusNode: findFocus,
                            onChanged: (_) => onQueryChanged(),
                            style: const TextStyle(fontSize: 13, fontFamily: kFindFont),
                            decoration: InputDecoration(
                              isDense: true,
                              hintText: '查找',
                              prefixIcon: const Icon(Icons.search, size: 16),
                              prefixIconConstraints: const BoxConstraints(minWidth: 32, minHeight: 28),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                              errorText: null,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        SizedBox(
                          width: 72,
                          child: Text(
                            countLabel,
                            textAlign: TextAlign.right,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              color: error != null || (findController.text.isNotEmpty && matchCount == 0)
                                  ? colors.danger
                                  : colors.dimText,
                            ),
                          ),
                        ),
                        _Toggle(
                          label: 'Aa',
                          tooltip: '区分大小写 (Alt+C)',
                          selected: options.caseSensitive,
                          onTap: () => onOptionsChanged(
                            options.copyWith(caseSensitive: !options.caseSensitive),
                          ),
                        ),
                        _Toggle(
                          label: 'W',
                          tooltip: '全词匹配 (Alt+W)',
                          selected: options.wholeWord,
                          onTap: () => onOptionsChanged(
                            options.copyWith(wholeWord: !options.wholeWord),
                          ),
                        ),
                        _Toggle(
                          label: '.*',
                          tooltip: '使用正则表达式 (Alt+R)',
                          selected: options.regex,
                          onTap: () => onOptionsChanged(
                            options.copyWith(regex: !options.regex),
                          ),
                        ),
                        IconButton(
                          tooltip: '上一个 (Shift+Enter / Shift+F3)',
                          onPressed: onPrevious,
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(Icons.keyboard_arrow_up, size: 18),
                        ),
                        IconButton(
                          tooltip: '下一个 (Enter / F3)',
                          onPressed: onNext,
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(Icons.keyboard_arrow_down, size: 18),
                        ),
                        IconButton(
                          tooltip: '关闭 (Esc)',
                          onPressed: onClose,
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(Icons.close, size: 16),
                        ),
                      ],
                    ),
                    if (replaceMode) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: replaceController,
                              focusNode: replaceFocus,
                              style: const TextStyle(fontSize: 13, fontFamily: kFindFont),
                              decoration: const InputDecoration(
                                isDense: true,
                                hintText: '替换',
                                prefixIcon: Icon(Icons.find_replace, size: 16),
                                prefixIconConstraints: BoxConstraints(minWidth: 32, minHeight: 28),
                                contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          _Toggle(
                            label: 'AB',
                            tooltip: '保留大小写 (Alt+P)',
                            selected: options.preserveCase,
                            onTap: () => onOptionsChanged(
                              options.copyWith(preserveCase: !options.preserveCase),
                            ),
                          ),
                          IconButton(
                            tooltip: '替换 (Enter)',
                            onPressed: onReplace,
                            visualDensity: VisualDensity.compact,
                            icon: const Icon(Icons.find_replace, size: 18),
                          ),
                          IconButton(
                            tooltip: '全部替换 (Ctrl+Alt+Enter)',
                            onPressed: onReplaceAll,
                            visualDensity: VisualDensity.compact,
                            icon: const Icon(Icons.done_all, size: 18),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

const kFindFont = 'Consolas';

class _Toggle extends StatelessWidget {
  const _Toggle({
    required this.label,
    required this.tooltip,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String tooltip;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 1),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          color: selected ? colors.accent.withValues(alpha: 0.25) : Colors.transparent,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              fontFamily: kFindFont,
              color: selected ? colors.accent : colors.dimText,
            ),
          ),
        ),
      ),
    );
  }
}
