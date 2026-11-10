import 'package:flutter/material.dart';

import '../format/krec.dart';
import '../services/app_controller.dart';
import '../theme.dart';
import '../ui/dialogs.dart';
import '../util.dart';

class RecordingsPage extends StatelessWidget {
  const RecordingsPage({required this.app, super.key});

  final AppController app;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: app,
      builder: (context, _) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 18, 20, 8),
              child: Text('已录制操作', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
            ),
            Expanded(
              child: app.recordings.isEmpty
                  ? const Center(child: Text('还没有录制。在欢迎页输入“操作录制”或按 Ctrl+Alt+R。', style: TextStyle(color: kMuted, fontSize: 13)))
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                      itemCount: app.recordings.length + 1,
                      itemBuilder: (context, index) {
                        if (index == app.recordings.length) {
                          return const Padding(
                            padding: EdgeInsets.only(top: 8),
                            child: Text(
                              '同一时间只能录制或播放一条。循环次数填 0 表示一直循环。手柄回放需要 ViGEmClient.dll 和 ViGEmBus。',
                              style: TextStyle(color: kMuted, fontSize: 12, height: 1.4),
                            ),
                          );
                        }
                        final item = app.recordings[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: RecordingTile(
                            app: app,
                            meta: item,
                            selected: item.path == app.selectedPath,
                            playing: app.activity == RunActivity.playing && app.currentPlay?.path == item.path,
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}

class RecordingTile extends StatefulWidget {
  const RecordingTile({
    required this.app,
    required this.meta,
    required this.selected,
    required this.playing,
    super.key,
  });

  final AppController app;
  final RecordingMeta meta;
  final bool selected;
  final bool playing;

  @override
  State<RecordingTile> createState() => _RecordingTileState();
}

class _RecordingTileState extends State<RecordingTile> {
  late final TextEditingController _interval = TextEditingController(text: _seconds(widget.meta.loopIntervalMs));
  late final TextEditingController _count = TextEditingController(text: '${widget.meta.loopCount}');

  @override
  void didUpdateWidget(RecordingTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.meta.loopIntervalMs != widget.meta.loopIntervalMs) {
      _interval.text = _seconds(widget.meta.loopIntervalMs);
    }
    if (oldWidget.meta.loopCount != widget.meta.loopCount) {
      _count.text = '${widget.meta.loopCount}';
    }
  }

  @override
  void dispose() {
    _interval.dispose();
    _count.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final meta = widget.meta;
    final app = widget.app;
    final busy = app.activity != RunActivity.idle;
    final mode = meta.playbackMode < 0 || meta.playbackMode > kAfterLoop ? kAfterNone : meta.playbackMode;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: kPanel,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: widget.selected ? kAccent : kLine),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(meta.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text(
                        '${formatDateTime(meta.created)} · ${meta.durationLabel} · ${meta.eventCount} 个事件${meta.hasGamepad ? ' · 含手柄' : ''}',
                        style: const TextStyle(color: kMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: busy && !widget.playing ? null : () => widget.playing ? app.togglePause() : app.play(meta),
                  child: Text(widget.playing ? (app.paused ? '继续' : '暂停') : '播放'),
                ),
                TextButton(onPressed: () => _view(context), child: const Text('查看')),
                TextButton(onPressed: busy ? null : () => _rename(context), child: const Text('重命名')),
                TextButton(onPressed: busy ? null : () => _delete(context), child: const Text('删除')),
              ],
            ),
            const SizedBox(height: 6),
            SegmentedButton<int>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment(value: kAfterNone, label: Text('播完保持')),
                ButtonSegment(value: kAfterShutdown, label: Text('播完关机')),
                ButtonSegment(value: kAfterLoop, label: Text('循环播放')),
              ],
              selected: {mode},
              onSelectionChanged: (value) {
                app.setPlayback(meta, mode: value.first, intervalMs: _intervalMs(), count: _loopCount());
              },
            ),
            if (mode == kAfterLoop) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  SizedBox(
                    width: 120,
                    child: TextField(
                      controller: _interval,
                      decoration: const InputDecoration(labelText: '间隔（秒）'),
                      onSubmitted: (_) => _commit(),
                      onEditingComplete: _commit,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 140,
                    child: TextField(
                      controller: _count,
                      decoration: const InputDecoration(labelText: '次数，0 为无限'),
                      onSubmitted: (_) => _commit(),
                      onEditingComplete: _commit,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  int _intervalMs() {
    final seconds = double.tryParse(_interval.text.trim()) ?? 1;
    return (seconds * 1000).round().clamp(0, 3600000);
  }

  int _loopCount() {
    return int.tryParse(_count.text.trim())?.clamp(0, 9999) ?? 0;
  }

  void _commit() {
    widget.app.setPlayback(
      widget.meta,
      mode: widget.meta.playbackMode,
      intervalMs: _intervalMs(),
      count: _loopCount(),
    );
  }

  Future<void> _rename(BuildContext context) async {
    final name = await showRenameDialog(context, widget.meta.name);
    if (name == null || name.trim().isEmpty) return;
    await widget.app.rename(widget.meta, name);
  }

  Future<void> _delete(BuildContext context) async {
    final ok = await showConfirm(context, '删除「${widget.meta.name}」？此操作不可恢复。');
    if (!ok) return;
    await widget.app.deleteRecording(widget.meta);
  }

  Future<void> _view(BuildContext context) async {
    final path = widget.meta.path;
    await showDialog<void>(
      context: context,
      builder: (context) {
        return Dialog(
          child: SizedBox(
            width: 560,
            height: 520,
            child: FutureBuilder<List<SummaryLine>>(
              future: Krec.summarizeFile(path),
              builder: (context, snapshot) {
                final lines = snapshot.data ?? const <SummaryLine>[];
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 14, 8, 8),
                      child: Row(
                        children: [
                          Expanded(child: Text(widget.meta.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700))),
                          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, size: 18)),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    Expanded(
                      child: snapshot.connectionState != ConnectionState.done
                          ? const Center(child: Text('正在读取…', style: TextStyle(color: kMuted)))
                          : ListView.builder(
                              itemCount: lines.length,
                              itemBuilder: (context, index) {
                                final line = lines[index];
                                return ListTile(
                                  dense: true,
                                  title: Text(line.title, style: const TextStyle(fontSize: 13)),
                                  subtitle: line.detail.isEmpty ? null : Text(line.detail, style: const TextStyle(fontSize: 12)),
                                );
                              },
                            ),
                    ),
                  ],
                );
              },
            ),
          ),
        );
      },
    );
  }
}

String _seconds(int milliseconds) {
  final value = milliseconds / 1000;
  if (value == value.roundToDouble()) return value.toStringAsFixed(0);
  return value.toStringAsFixed(1);
}
