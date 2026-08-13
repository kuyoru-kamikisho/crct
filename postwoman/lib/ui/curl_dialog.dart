import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

Future<String?> showCurlImportDialog(BuildContext context, {String initial = ''}) {
  return showDialog<String>(
    context: context,
    builder: (context) => _CurlImportDialog(initial: initial),
  );
}

class _CurlImportDialog extends StatefulWidget {
  final String initial;
  const _CurlImportDialog({required this.initial});

  @override
  State<_CurlImportDialog> createState() => _CurlImportDialogState();
}

class _CurlImportDialogState extends State<_CurlImportDialog> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initial);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _paste() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text != null) {
      setState(() => _ctrl.text = data!.text!);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('从 curl 导入'),
      content: SizedBox(
        width: 640,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('粘贴 bash curl 命令，会填入方法、URL、请求头和请求体。'),
            const SizedBox(height: 8),
            TextField(
              controller: _ctrl,
              maxLines: 12,
              minLines: 8,
              style: const TextStyle(fontFamily: 'Consolas', fontSize: 13),
              decoration: const InputDecoration(
                hintText: "curl 'https://example.com' -H 'Accept: application/json'",
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: _paste, child: const Text('从剪贴板粘贴')),
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('取消')),
        FilledButton(
          onPressed: () => Navigator.pop(context, _ctrl.text),
          child: const Text('解析'),
        ),
      ],
    );
  }
}
