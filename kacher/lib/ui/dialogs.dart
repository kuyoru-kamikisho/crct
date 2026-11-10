import 'package:flutter/material.dart';

const String kRecordWarning =
    '警告：录制过程中严禁输入银行卡号、密码等隐私信息，因此造成的隐私泄露本软件开发者不承担任何责任。温馨提示：部分系统按键如 Win 键、Fn键等特殊按键可能无法被录制';

Future<bool> showRecordWarning(BuildContext context) async {
  final result = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (context) {
      return AlertDialog(
        title: const Text('开始录制'),
        content: const SizedBox(
          width: 420,
          child: Text(kRecordWarning, style: TextStyle(fontSize: 13, height: 1.45)),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('取消')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('确认')),
        ],
      );
    },
  );
  return result ?? false;
}

Future<String?> showSaveRecordingDialog(
  BuildContext context, {
  required String initialName,
  required String summary,
}) {
  return showDialog<String>(
    context: context,
    barrierDismissible: false,
    builder: (context) => _SaveDialog(initialName: initialName, summary: summary),
  );
}

class _SaveDialog extends StatefulWidget {
  const _SaveDialog({
    required this.initialName,
    required this.summary,
    this.cancelLabel = '放弃',
    this.confirmLabel = '保存',
  });

  final String initialName;
  final String summary;
  final String cancelLabel;
  final String confirmLabel;

  @override
  State<_SaveDialog> createState() => _SaveDialogState();
}

class _SaveDialogState extends State<_SaveDialog> {
  late final TextEditingController _name = TextEditingController(text: widget.initialName);

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('保存录制'),
      content: SizedBox(
        width: 420,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.summary, style: const TextStyle(fontSize: 12, color: Color(0xFF9399A6))),
            const SizedBox(height: 10),
            TextField(
              controller: _name,
              autofocus: true,
              decoration: const InputDecoration(labelText: '名称'),
              onSubmitted: (_) => _save(),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(widget.cancelLabel)),
        FilledButton(onPressed: _save, child: Text(widget.confirmLabel)),
      ],
    );
  }

  void _save() {
    final name = _name.text.trim();
    if (name.isEmpty) return;
    Navigator.pop(context, name);
  }
}

Future<bool> showConfirm(BuildContext context, String message) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('请确认'),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('取消')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('确认')),
      ],
    ),
  );
  return result ?? false;
}

Future<String?> showRenameDialog(BuildContext context, String initialName) {
  return showDialog<String>(
    context: context,
    builder: (context) => _SaveDialog(
      initialName: initialName,
      summary: '修改这条录制的名称',
      cancelLabel: '取消',
      confirmLabel: '重命名',
    ),
  );
}
