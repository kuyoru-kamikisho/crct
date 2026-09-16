import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../utils/text_search.dart';

/// 修复 Windows 剪贴板历史（Win+V）无法粘贴到 Flutter 文本框的问题。
///
/// 典型原因：
/// 1. 系统用 Ctrl+V 注入粘贴时，Flutter 仍认为 Win/Meta 处于按下状态，默认粘贴快捷键不匹配；
/// 2. 剪贴板浮层关闭后焦点没有回到 EditableText。
class SystemPaste {
  SystemPaste._();

  static const MethodChannel _channel = MethodChannel('http_client/window');

  static DateTime? _lastPasteAt;
  static TextEditingController? lastController;
  static FocusNode? lastFocusNode;
  static bool _listening = false;

  static void init() {
    if (_listening) return;
    _listening = true;
    _channel.setMethodCallHandler((call) async {
      switch (call.method) {
        case 'paste':
          await pasteFromClipboard();
          return;
        case 'focus':
          await HardwareKeyboard.instance.syncKeyboardState();
          lastFocusNode?.requestFocus();
          return;
      }
    });
    HardwareKeyboard.instance.addHandler(_onKey);
  }

  static void remember(TextEditingController controller, FocusNode focus) {
    lastController = controller;
    lastFocusNode = focus;
  }

  static bool _onKey(KeyEvent event) {
    if (event is! KeyDownEvent) return false;
    if (event.logicalKey != LogicalKeyboardKey.keyV) return false;
    final hw = HardwareKeyboard.instance;
    if (!hw.isControlPressed || hw.isAltPressed) return false;

    final editable = _findEditableState();
    if (hw.isMetaPressed) {
      pasteFromClipboard(preferred: editable?.widget.controller);
      return true;
    }
    if (editable == null) {
      pasteFromClipboard();
      return true;
    }
    return false;
  }

  static EditableTextState? _findEditableState() {
    final focus = primaryFocus;
    final ctx = focus?.context;
    if (ctx == null) return null;
    if (ctx is StatefulElement && ctx.state is EditableTextState) {
      return ctx.state as EditableTextState;
    }
    return ctx.findAncestorStateOfType<EditableTextState>();
  }

  static Future<void> pasteFromClipboard({TextEditingController? preferred}) async {
    final now = DateTime.now();
    if (_lastPasteAt != null &&
        now.difference(_lastPasteAt!) < const Duration(milliseconds: 220)) {
      return;
    }
    _lastPasteAt = now;

    await HardwareKeyboard.instance.syncKeyboardState();

    final editable = _findEditableState();
    final controller = preferred ?? editable?.widget.controller ?? lastController;
    if (controller == null) return;

    if (identical(controller, lastController)) {
      lastFocusNode?.requestFocus();
    } else {
      editable?.widget.focusNode.requestFocus();
    }

    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final text = data?.text;
    if (text == null || text.isEmpty) return;
    controller.value = pasteIntoEditingValue(controller.value, text);
  }
}
