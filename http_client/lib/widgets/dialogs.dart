import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';

Future<void> showCurlImportDialog(
  BuildContext context, {
  required void Function(String curl) onImport,
}) async {
  final controller = TextEditingController();
  final colors = AppColors.of(context);
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) {
      return AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.download_outlined),
            SizedBox(width: 8),
            Text('导入 curl'),
          ],
        ),
        content: SizedBox(
          width: 640,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                '粘贴 bash curl 或 Windows cmd curl 命令，将转换为编辑器中的 HTTP 请求格式。',
                style: TextStyle(color: colors.dimText, fontSize: 13),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                maxLines: 14,
                style: const TextStyle(fontFamily: 'Consolas', fontSize: 13),
                decoration: const InputDecoration(
                  hintText:
                      "curl -X POST 'https://httpbin.org/post' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"hello\":\"world\"}'",
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.check, size: 16),
            label: const Text('导入'),
          ),
        ],
      );
    },
  );
  if (ok == true && controller.text.trim().isNotEmpty) {
    try {
      onImport(controller.text);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('导入失败: $e'), backgroundColor: colors.danger),
        );
      }
    }
  }
  controller.dispose();
}

Future<void> showEnvEditorDialog(
  BuildContext context, {
  required Map<String, Map<String, String>> environments,
  required Future<void> Function(Map<String, Map<String, String>>) onSave,
}) async {
  final envs = {
    for (final e in environments.entries) e.key: Map<String, String>.from(e.value),
  };
  if (envs.isEmpty) {
    envs['dev'] = {'host': 'https://httpbin.org', 'token': 'demo'};
  }
  var selected = envs.keys.first;

  await showDialog<void>(
    context: context,
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setState) {
          final vars = envs[selected]!;
          return AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.tune),
                SizedBox(width: 8),
                Text('环境变量'),
              ],
            ),
            content: SizedBox(
              width: 720,
              height: 420,
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: selected,
                          items: envs.keys
                              .map((k) => DropdownMenuItem(value: k, child: Text(k)))
                              .toList(),
                          onChanged: (v) {
                            if (v == null) return;
                            setState(() => selected = v);
                          },
                          decoration: const InputDecoration(labelText: '当前环境'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () async {
                          final name = await _prompt(ctx, '新环境名称');
                          if (name == null || name.trim().isEmpty) return;
                          setState(() {
                            envs[name.trim()] = {'host': 'https://httpbin.org'};
                            selected = name.trim();
                          });
                        },
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('新建'),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: envs.length <= 1
                            ? null
                            : () {
                                setState(() {
                                  envs.remove(selected);
                                  selected = envs.keys.first;
                                });
                              },
                        icon: const Icon(Icons.delete_outline, size: 16),
                        label: const Text('删除'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: ListView(
                      children: [
                        for (final key in vars.keys.toList())
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 180,
                                  child: TextFormField(
                                    initialValue: key,
                                    decoration: const InputDecoration(labelText: '变量名'),
                                    onChanged: (v) {
                                      final value = vars.remove(key) ?? '';
                                      if (v.trim().isNotEmpty) vars[v] = value;
                                    },
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextFormField(
                                    initialValue: vars[key],
                                    decoration: const InputDecoration(labelText: '值'),
                                    onChanged: (v) => vars[key] = v,
                                  ),
                                ),
                                IconButton(
                                  tooltip: '删除变量',
                                  onPressed: () => setState(() => vars.remove(key)),
                                  icon: const Icon(Icons.close),
                                ),
                              ],
                            ),
                          ),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton.icon(
                            onPressed: () {
                              setState(() {
                                var i = 1;
                                while (vars.containsKey('var$i')) {
                                  i++;
                                }
                                vars['var$i'] = '';
                              });
                            },
                            icon: const Icon(Icons.add),
                            label: const Text('添加变量'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    r'在请求中使用 {{变量名}}；内置 {{$uuid}} / {{$timestamp}} / {{$isoTimestamp}} / {{$randomInt}}',
                    style: TextStyle(fontSize: 12, color: AppColors.of(ctx).dimText),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
              ElevatedButton.icon(
                onPressed: () async {
                  for (final e in envs.entries) {
                    e.value.removeWhere((k, _) => k.trim().isEmpty);
                  }
                  await onSave(envs);
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                icon: const Icon(Icons.save_outlined, size: 16),
                label: const Text('保存'),
              ),
            ],
          );
        },
      );
    },
  );
}

Future<String?> _prompt(BuildContext context, String title) async {
  final c = TextEditingController();
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: TextField(controller: c, autofocus: true),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('确定')),
      ],
    ),
  );
  final text = c.text;
  c.dispose();
  return ok == true ? text : null;
}

Future<void> showHistoryDialog(
  BuildContext context, {
  required List<HistoryItem> history,
  required VoidCallback onClear,
}) async {
  final colors = AppColors.of(context);
  await showDialog<void>(
    context: context,
    builder: (ctx) {
      return AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.history),
            const SizedBox(width: 8),
            const Text('历史记录'),
            const Spacer(),
            TextButton.icon(
              onPressed: () {
                onClear();
                Navigator.pop(ctx);
              },
              icon: const Icon(Icons.delete_sweep_outlined, size: 16),
              label: const Text('清空'),
            ),
          ],
        ),
        content: SizedBox(
          width: 760,
          height: 480,
          child: history.isEmpty
              ? Center(child: Text('暂无历史', style: TextStyle(color: colors.dimText)))
              : ListView.separated(
                  itemCount: history.length,
                  separatorBuilder: (_, __) => Divider(height: 1, color: colors.border),
                  itemBuilder: (_, i) {
                    final h = history[i];
                    final ok = h.error == null &&
                        (h.statusCode == null || (h.statusCode! >= 200 && h.statusCode! < 400));
                    return ListTile(
                      dense: true,
                      leading: Icon(
                        ok ? Icons.check_circle : Icons.error,
                        color: ok ? colors.success : colors.danger,
                        size: 18,
                      ),
                      title: Text(
                        '${h.method} ${h.url}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontFamily: 'Consolas', fontSize: 12),
                      ),
                      subtitle: Text(
                        '${h.time} · ${h.statusCode ?? '-'} · ${h.durationMs ?? '-'} ms',
                        style: TextStyle(fontSize: 11, color: colors.dimText),
                      ),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('关闭')),
        ],
      );
    },
  );
}

Future<void> showAboutDialogCustom(BuildContext context) {
  return showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('关于 HTTP Client'),
      content: const Text(
        '类似 JetBrains HTTP Client 的桌面接口测试工具。\n'
        '基于 Flutter 构建，支持语法高亮、环境变量、curl 导入、\n'
        '流式响应、文件下载与 WebSocket。\n\n'
        '本地数据保存在可执行文件同级目录的 http_client_data/ 下。',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('关闭')),
      ],
    ),
  );
}
