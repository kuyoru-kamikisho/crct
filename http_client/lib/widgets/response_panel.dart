import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../models/models.dart';
import '../state/app_controller.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';

class ResponsePanel extends StatefulWidget {
  const ResponsePanel({super.key, required this.controller});

  final AppController controller;

  @override
  State<ResponsePanel> createState() => _ResponsePanelState();
}

class _ResponsePanelState extends State<ResponsePanel> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final TextEditingController _wsInput = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _wsInput.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    final colors = AppColors.of(context);
    final result = c.activeResult;

    return ColoredBox(
      color: colors.panelBg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _StatusBar(result: result, colors: colors),
          Container(
            color: colors.tabBarBg,
            child: Row(
              children: [
                Expanded(
                  child: TabBar(
                    controller: _tabs,
                    isScrollable: true,
                    tabs: const [
                      Tab(text: 'Body', height: 36),
                      Tab(text: 'Headers', height: 36),
                      Tab(text: 'WebSocket', height: 36),
                      Tab(text: 'Results', height: 36),
                    ],
                  ),
                ),
                if (result != null) ...[
                  IconButton(
                    tooltip: '复制响应体',
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: result.bodyText));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('已复制响应体'),
                          behavior: SnackBarBehavior.floating,
                          duration: Duration(seconds: 1),
                        ),
                      );
                    },
                    icon: const Icon(Icons.copy, size: 18),
                  ),
                  if (!result.done)
                    IconButton(
                      tooltip: '取消请求',
                      onPressed: c.cancelActive,
                      icon: Icon(Icons.stop_circle_outlined, color: colors.danger, size: 18),
                    ),
                ],
              ],
            ),
          ),
          Divider(height: 1, color: colors.border),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _BodyTab(result: result),
                _HeadersTab(result: result),
                _WsTab(
                  controller: c,
                  input: _wsInput,
                ),
                _ResultsTab(controller: c),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBar extends StatelessWidget {
  const _StatusBar({required this.result, required this.colors});
  final ExecutionResult? result;
  final AppColors colors;

  @override
  Widget build(BuildContext context) {
    if (result == null) {
      return Container(
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        alignment: Alignment.centerLeft,
        child: Text('响应面板 — 运行请求后在此查看结果', style: TextStyle(color: colors.dimText, fontSize: 12)),
      );
    }
    final r = result!;
    final code = r.statusCode;
    final ok = r.ok;
    return Container(
      height: 32,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      color: ok ? colors.statusOkBg : colors.statusErrBg,
      child: Row(
        children: [
          Icon(ok ? Icons.check_circle : Icons.error, size: 14, color: ok ? colors.success : colors.danger),
          const SizedBox(width: 8),
          Text(
            code == null ? (r.statusText ?? '—') : '$code ${r.statusText ?? ''}',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: ok ? colors.success : colors.danger,
              fontSize: 12,
            ),
          ),
          const SizedBox(width: 16),
          Text(formatDuration(r.duration), style: TextStyle(fontSize: 12, color: colors.dimText)),
          const SizedBox(width: 16),
          Text(formatBytes(r.receivedBytes), style: TextStyle(fontSize: 12, color: colors.dimText)),
          if (r.contentLength != null && r.contentLength! > 0) ...[
            Text(' / ${formatBytes(r.contentLength!)}', style: TextStyle(fontSize: 12, color: colors.dimText)),
          ],
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              '${r.method} ${r.url}',
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, color: colors.dimText, fontFamily: 'Consolas'),
            ),
          ),
          if (r.downloadPath != null)
            Text('已下载', style: TextStyle(fontSize: 12, color: colors.success)),
        ],
      ),
    );
  }
}

class _BodyTab extends StatelessWidget {
  const _BodyTab({required this.result});
  final ExecutionResult? result;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    if (result == null) {
      return Center(child: Text('暂无响应', style: TextStyle(color: colors.dimText)));
    }
    final text = result!.error != null
        ? '错误:\n${result!.error}'
        : (result!.bodyText.isEmpty ? '（空响应体）' : result!.bodyText);
    return ColoredBox(
      color: colors.editorBg,
      child: SelectionArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(12),
          child: Text(
            text,
            style: TextStyle(
              fontFamily: 'Consolas',
              fontSize: 13,
              height: 1.45,
              color: result!.error != null ? colors.danger : colors.highlight.body,
            ),
          ),
        ),
      ),
    );
  }
}

class _HeadersTab extends StatelessWidget {
  const _HeadersTab({required this.result});
  final ExecutionResult? result;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    if (result == null || result!.headers.isEmpty) {
      return Center(child: Text('暂无响应头', style: TextStyle(color: colors.dimText)));
    }
    final entries = result!.headers.entries.toList()
      ..sort((a, b) => a.key.toLowerCase().compareTo(b.key.toLowerCase()));
    return ColoredBox(
      color: colors.editorBg,
      child: ListView.separated(
        itemCount: entries.length,
        separatorBuilder: (_, __) => Divider(height: 1, color: colors.border),
        itemBuilder: (_, i) {
          final e = entries[i];
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 220,
                  child: Text(e.key, style: TextStyle(color: colors.highlight.headerKey, fontFamily: 'Consolas')),
                ),
                Expanded(
                  child: SelectableText(e.value, style: TextStyle(fontFamily: 'Consolas', color: colors.highlight.headerValue)),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _WsTab extends StatelessWidget {
  const _WsTab({required this.controller, required this.input});
  final AppController controller;
  final TextEditingController input;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final id = controller.activeWsSessionId;
    final messages = id == null ? const <WsMessage>[] : (controller.wsMessages[id] ?? []);
    final connected = controller.activeResult?.kind == RequestKind.websocket &&
        !(controller.activeResult?.done ?? true) &&
        controller.activeResult?.error == null;

    return Column(
      children: [
        Expanded(
          child: messages.isEmpty
              ? Center(
                  child: Text(
                    'WebSocket 消息将显示在这里\n连接成功后可在下方发送文本',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: colors.dimText),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: messages.length,
                  itemBuilder: (_, i) {
                    final m = messages[i];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.all(8),
                      color: m.outgoing ? colors.hover : colors.editorBg,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            m.outgoing ? Icons.north_east : Icons.south_west,
                            size: 14,
                            color: m.outgoing ? colors.accent : colors.success,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: SelectableText(
                              m.text,
                              style: const TextStyle(fontFamily: 'Consolas', fontSize: 13),
                            ),
                          ),
                          Text(
                            DateFormat('HH:mm:ss').format(m.time),
                            style: TextStyle(fontSize: 11, color: colors.dimText),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
        Divider(height: 1, color: colors.border),
        Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: input,
                  enabled: connected,
                  decoration: InputDecoration(
                    hintText: connected ? '输入要发送的 WebSocket 文本…' : '请先运行 WEBSOCKET 请求并保持连接',
                    prefixIcon: const Icon(Icons.chat_bubble_outline, size: 18),
                  ),
                  onSubmitted: (_) => _send(context),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: connected ? () => _send(context) : null,
                icon: const Icon(Icons.send, size: 16),
                label: const Text('发送'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _send(BuildContext context) {
    final text = input.text;
    if (text.trim().isEmpty) return;
    controller.sendWsMessage(text);
    input.clear();
  }
}

class _ResultsTab extends StatelessWidget {
  const _ResultsTab({required this.controller});
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final list = controller.results;
    if (list.isEmpty) {
      return Center(child: Text('本次会话尚无结果', style: TextStyle(color: colors.dimText)));
    }
    return ListView.separated(
      itemCount: list.length,
      separatorBuilder: (_, __) => Divider(height: 1, color: colors.border),
      itemBuilder: (_, i) {
        final r = list[i];
        final selected = r.id == controller.activeResultId;
        return ListTile(
          dense: true,
          selected: selected,
          selectedTileColor: colors.hover,
          leading: Icon(
            r.ok ? Icons.check_circle : Icons.error,
            size: 16,
            color: r.ok ? colors.success : colors.danger,
          ),
          title: Text(
            '${r.method} ${r.url}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontFamily: 'Consolas', fontSize: 12),
          ),
          subtitle: Text(
            '${r.statusCode ?? '-'} · ${formatDuration(r.duration)} · ${formatBytes(r.receivedBytes)}',
            style: TextStyle(fontSize: 11, color: colors.dimText),
          ),
          onTap: () => controller.selectResult(r.id),
        );
      },
    );
  }
}
