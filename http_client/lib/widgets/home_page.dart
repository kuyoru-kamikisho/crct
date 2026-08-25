import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;

import '../state/app_controller.dart';
import '../theme/app_theme.dart';
import '../widgets/dialogs.dart';
import '../widgets/http_code_editor.dart';
import '../widgets/response_panel.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.controller});

  final AppController controller;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  AppController get c => widget.controller;

  int _caretLine() {
    final text = c.editorController.text;
    final offset = c.editorController.selection.baseOffset.clamp(0, text.length);
    return '\n'.allMatches(text.substring(0, offset)).length;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: c,
      builder: (context, _) {
        final colors = AppColors.of(context);
        final title = c.currentFilePath == null
            ? 'untitled.http'
            : p.basename(c.currentFilePath!);
        return Scaffold(
          body: CallbackShortcuts(
            bindings: {
              const SingleActivator(LogicalKeyboardKey.keyS, control: true): () => c.saveFile(),
              const SingleActivator(LogicalKeyboardKey.keyO, control: true): () => c.openFile(),
              const SingleActivator(LogicalKeyboardKey.keyN, control: true): () => c.newFile(),
              const SingleActivator(LogicalKeyboardKey.enter, control: true): () => c.runAtLine(_caretLine()),
              const SingleActivator(LogicalKeyboardKey.enter, control: true, shift: true): () => c.runAll(),
              const SingleActivator(LogicalKeyboardKey.keyF, control: true, alt: true): c.formatDocument,
            },
            child: Focus(
              autofocus: true,
              child: Column(
                children: [
                  _Toolbar(controller: c, fileTitle: title, onRunCaret: () => c.runAtLine(_caretLine())),
                  Divider(height: 1, color: colors.border),
                  Expanded(
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final total = constraints.maxHeight;
                        final top = total * c.settings.splitRatio;
                        return Column(
                          children: [
                            SizedBox(
                              height: top,
                              child: HttpCodeEditor(
                                controller: c.editorController,
                                document: c.document,
                                lineStatus: c.lineStatus,
                                onRunLine: c.runAtLine,
                              ),
                            ),
                            _SplitHandle(
                              onDrag: (dy) {
                                final ratio = (top + dy) / total;
                                c.setSplitRatio(ratio);
                              },
                              onDragEnd: c.persistSplit,
                            ),
                            Expanded(child: ResponsePanel(controller: c)),
                          ],
                        );
                      },
                    ),
                  ),
                  _StatusFooter(controller: c),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SplitHandle extends StatelessWidget {
  const _SplitHandle({required this.onDrag, required this.onDragEnd});
  final void Function(double dy) onDrag;
  final VoidCallback onDragEnd;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return MouseRegion(
      cursor: SystemMouseCursors.resizeUpDown,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onVerticalDragUpdate: (d) => onDrag(d.delta.dy),
        onVerticalDragEnd: (_) => onDragEnd(),
        child: Container(
          height: 6,
          color: colors.border,
          alignment: Alignment.center,
          child: Container(width: 40, height: 2, color: colors.dimText.withValues(alpha: 0.5)),
        ),
      ),
    );
  }
}

class _Toolbar extends StatelessWidget {
  const _Toolbar({
    required this.controller,
    required this.fileTitle,
    required this.onRunCaret,
  });
  final AppController controller;
  final String fileTitle;
  final VoidCallback onRunCaret;

  @override
  Widget build(BuildContext context) {
    final c = controller;
    final colors = AppColors.of(context);
    return Container(
      height: 44,
      color: colors.toolbarBg,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          _IconAction(icon: Icons.note_add_outlined, tip: '新建 (Ctrl+N)', onTap: c.newFile),
          _IconAction(icon: Icons.folder_open_outlined, tip: '打开 (Ctrl+O)', onTap: c.openFile),
          _IconAction(icon: Icons.save_outlined, tip: '保存 (Ctrl+S)', onTap: () => c.saveFile()),
          _IconAction(icon: Icons.save_as_outlined, tip: '另存为', onTap: () => c.saveFile(saveAs: true)),
          _VSep(colors),
          _IconAction(
            icon: Icons.history,
            tip: '历史记录',
            onTap: () {
              showHistoryDialog(
                context,
                history: c.history,
                onClear: c.clearHistory,
              );
            },
          ),
          _IconAction(
            icon: Icons.download_outlined,
            tip: '导入 curl',
            onTap: () => showCurlImportDialog(
              context,
              onImport: (curl) {
                try {
                  c.importCurl(curl);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('curl 已导入到编辑器'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('导入失败: $e'), backgroundColor: colors.danger),
                  );
                }
              },
            ),
          ),
          _IconAction(
            icon: Icons.format_align_left,
            tip: '格式化 (Ctrl+Alt+F)',
            onTap: c.formatDocument,
          ),
          _VSep(colors),
          _IconAction(
            icon: Icons.play_arrow,
            tip: '运行光标处请求 (Ctrl+Enter)',
            color: colors.play,
            onTap: onRunCaret,
          ),
          _IconAction(
            icon: Icons.playlist_play,
            tip: '运行全部请求 (Ctrl+Shift+Enter)',
            color: colors.play,
            onTap: c.runAll,
          ),
          _IconAction(
            icon: Icons.stop_circle_outlined,
            tip: '取消当前请求',
            color: colors.danger,
            onTap: c.cancelActive,
          ),
          _VSep(colors),
          const Icon(Icons.layers_outlined, size: 16),
          const SizedBox(width: 6),
          Text('Run with:', style: TextStyle(fontSize: 12, color: colors.dimText)),
          const SizedBox(width: 8),
          SizedBox(
            width: 160,
            child: DropdownButtonFormField<String>(
              isDense: true,
              value: c.envNames.contains(c.settings.selectedEnv)
                  ? c.settings.selectedEnv
                  : (c.envNames.isEmpty ? null : c.envNames.first),
              hint: const Text('No Environment'),
              items: [
                const DropdownMenuItem(value: '', child: Text('No Environment')),
                ...c.envNames.map((e) => DropdownMenuItem(value: e, child: Text(e))),
              ],
              onChanged: (v) => c.selectEnv(v ?? ''),
            ),
          ),
          IconButton(
            tooltip: '编辑环境变量',
            onPressed: () => showEnvEditorDialog(
              context,
              environments: c.environments,
              onSave: c.saveEnvironments,
            ),
            icon: const Icon(Icons.tune, size: 18),
          ),
          _VSep(colors),
          PopupMenuButton<String>(
            tooltip: '插入模板',
            onSelected: c.insertTemplate,
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'get', child: Text('GET 请求')),
              PopupMenuItem(value: 'post', child: Text('POST JSON')),
              PopupMenuItem(value: 'ws', child: Text('WebSocket')),
              PopupMenuItem(value: 'sse', child: Text('SSE 流式')),
              PopupMenuItem(value: 'download', child: Text('文件下载')),
              PopupMenuItem(value: 'graphql', child: Text('GraphQL')),
            ],
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                children: [
                  Icon(Icons.add_box_outlined, size: 18),
                  SizedBox(width: 4),
                  Text('模板', style: TextStyle(fontSize: 12)),
                  Icon(Icons.arrow_drop_down, size: 18),
                ],
              ),
            ),
          ),
          const Spacer(),
          Text(
            fileTitle + (c.dirty ? ' *' : ''),
            style: TextStyle(fontSize: 12, color: colors.dimText, fontFamily: 'Consolas'),
          ),
          const SizedBox(width: 12),
          IconButton(
            tooltip: c.settings.darkTheme ? '切换明亮主题' : '切换暗色主题',
            onPressed: () => c.setThemeDark(!c.settings.darkTheme),
            icon: Icon(c.settings.darkTheme ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
          ),
          PopupMenuButton<String>(
            tooltip: '更多',
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'about', child: Text('关于')),
            ],
            onSelected: (v) {
              if (v == 'about') showAboutDialogCustom(context);
            },
            icon: const Icon(Icons.more_vert),
          ),
        ],
      ),
    );
  }
}

class _IconAction extends StatelessWidget {
  const _IconAction({
    required this.icon,
    required this.tip,
    required this.onTap,
    this.color,
  });
  final IconData icon;
  final String tip;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tip,
      onPressed: onTap,
      icon: Icon(icon, size: 20, color: color),
    );
  }
}

class _VSep extends StatelessWidget {
  const _VSep(this.colors);
  final AppColors colors;
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 22,
      margin: const EdgeInsets.symmetric(horizontal: 6),
      color: colors.border,
    );
  }
}

class _StatusFooter extends StatelessWidget {
  const _StatusFooter({required this.controller});
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final reqCount = controller.document.requests.length;
    return Container(
      height: 26,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: colors.toolbarBg,
        border: Border(top: BorderSide(color: colors.border)),
      ),
      child: Row(
        children: [
          Icon(Icons.circle, size: 8, color: colors.success),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              controller.statusMessage,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11, color: colors.dimText),
            ),
          ),
          Text('请求数: $reqCount', style: TextStyle(fontSize: 11, color: colors.dimText)),
          const SizedBox(width: 12),
          Text(
            '数据目录: http_client_data/',
            style: TextStyle(fontSize: 11, color: colors.dimText),
          ),
        ],
      ),
    );
  }
}
