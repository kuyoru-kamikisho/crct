import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import '../util.dart';

/// 录制文件头 4096 字节，小端。事件紧跟在头后面，每条 32 字节。
///
/// 0 magic "KREC" | 4 version u32 | 8 headerSize u32 | 12 eventCount u32
/// 16 reserved u32 | 20 durationUs u64 | 28 createdUnixMs u64
/// 36 playbackMode u32 | 40 loopIntervalMs u32 | 44 loopCount u32 | 48 flags u32
/// 52 name utf-8 240 字节，0 结尾
const int kHeaderSize = 4096;
const int kEventSize = 32;
const int kAfterNone = 0;
const int kAfterShutdown = 1;
const int kAfterLoop = 2;
const int kEvMove = 1;
const int kEvButton = 2;
const int kEvWheel = 3;
const int kEvKey = 4;
const int kEvPad = 5;
const int kEvDelay = 6;

class RecordingMeta {
  const RecordingMeta({
    required this.path,
    required this.name,
    required this.created,
    required this.durationUs,
    required this.eventCount,
    required this.playbackMode,
    required this.loopIntervalMs,
    required this.loopCount,
    required this.hasGamepad,
  });

  final String path;
  final String name;
  final DateTime created;
  final int durationUs;
  final int eventCount;
  final int playbackMode;
  final int loopIntervalMs;
  final int loopCount;
  final bool hasGamepad;

  String get durationLabel => formatClock(durationUs);
}

class InputEvent {
  const InputEvent({
    required this.dtUs,
    required this.type,
    required this.flags,
    required this.code,
    required this.x,
    required this.y,
    required this.z,
    required this.w,
    required this.v,
  });

  final int dtUs;
  final int type;
  final int flags;
  final int code;
  final int x;
  final int y;
  final int z;
  final int w;
  final int v;
}

class SummaryLine {
  const SummaryLine({required this.title, required this.detail});

  final String title;
  final String detail;
}

class Krec {
  static Future<RecordingMeta?> readMeta(String path) async {
    final file = File(path);
    if (!await file.exists()) return null;
    final raf = await file.open();
    try {
      final bytes = await raf.read(kHeaderSize);
      if (bytes.length < kHeaderSize) return null;
      return parseHeader(bytes, path);
    } finally {
      await raf.close();
    }
  }

  static RecordingMeta? parseHeader(Uint8List bytes, String path) {
    if (bytes.length < kHeaderSize) return null;
    if (bytes[0] != 0x4b ||
        bytes[1] != 0x52 ||
        bytes[2] != 0x45 ||
        bytes[3] != 0x43) {
      return null;
    }
    final data = ByteData.sublistView(bytes);
    final version = data.getUint32(4, Endian.little);
    final headerSize = data.getUint32(8, Endian.little);
    if (version != 1 || headerSize != kHeaderSize) return null;
    final nameBytes = bytes.sublist(52, 292);
    final zero = nameBytes.indexOf(0);
    final name = utf8.decode(
      nameBytes.sublist(0, zero < 0 ? nameBytes.length : zero),
      allowMalformed: true,
    ).trim();
    final createdMs = data.getUint64(28, Endian.little);
    return RecordingMeta(
      path: path,
      name: name.isEmpty ? '未命名' : name,
      created: DateTime.fromMillisecondsSinceEpoch(createdMs),
      durationUs: data.getUint64(20, Endian.little),
      eventCount: data.getUint32(12, Endian.little),
      playbackMode: data.getUint32(36, Endian.little),
      loopIntervalMs: data.getUint32(40, Endian.little),
      loopCount: data.getUint32(44, Endian.little),
      hasGamepad: (data.getUint32(48, Endian.little) & 1) != 0,
    );
  }

  static Future<List<RecordingMeta>> list(String directory) async {
    final dir = Directory(directory);
    if (!await dir.exists()) return [];
    final items = <RecordingMeta>[];
    await for (final entity in dir.list()) {
      if (entity is! File) continue;
      final lower = entity.path.toLowerCase();
      if (!lower.endsWith('.krec')) continue;
      if (lower.endsWith('\\_cache.krec') || lower.endsWith('/_cache.krec')) {
        continue;
      }
      final meta = await readMeta(entity.path);
      if (meta != null) items.add(meta);
    }
    items.sort((a, b) => b.created.compareTo(a.created));
    return items;
  }

  static Future<List<SummaryLine>> summarizeFile(String path, {int limit = 1500}) async {
    final events = <InputEvent>[];
    final raf = await File(path).open();
    try {
      await raf.setPosition(kHeaderSize);
      while (events.length < 2000000) {
        final bytes = await raf.read(kEventSize);
        if (bytes.length < kEventSize) break;
        events.add(parseEvent(bytes));
      }
    } finally {
      await raf.close();
    }
    return summarizeEvents(events, limit: limit);
  }
}

InputEvent parseEvent(List<int> bytes) {
  final data = ByteData.sublistView(Uint8List.fromList(bytes));
  return InputEvent(
    dtUs: data.getUint32(0, Endian.little),
    type: data.getUint8(4),
    flags: data.getUint8(5),
    code: data.getUint16(6, Endian.little),
    x: data.getInt32(8, Endian.little),
    y: data.getInt32(12, Endian.little),
    z: data.getInt32(16, Endian.little),
    w: data.getInt32(20, Endian.little),
    v: data.getInt32(24, Endian.little),
  );
}

List<SummaryLine> summarizeEvents(List<InputEvent> events, {int limit = 1500}) {
  final lines = <SummaryLine>[];
  var pendingGap = 0;
  _MoveGroup? move;
  var truncated = false;

  void flushMove() {
    if (move == null) return;
    lines.add(move!.toLine());
    move = null;
  }

  for (final event in events) {
    if (event.type == kEvMove) {
      if (move == null) {
        if (lines.length >= limit) {
          truncated = true;
          break;
        }
        pendingGap += event.dtUs;
        move = _MoveGroup(pendingGap, event.x, event.y);
        pendingGap = 0;
      }
      move!.count += 1;
      move!.x = event.x;
      move!.y = event.y;
      continue;
    }
    pendingGap += event.dtUs;
    if (event.type == kEvDelay) continue;
    flushMove();
    if (lines.length >= limit) {
      truncated = true;
      break;
    }
    lines.add(_lineFor(event, pendingGap));
    pendingGap = 0;
  }
  flushMove();
  if (truncated) {
    lines.add(const SummaryLine(title: '…', detail: '仅显示前面的操作汇总'));
  }
  return lines;
}

class _MoveGroup {
  _MoveGroup(this.gapUs, this.x, this.y);

  int gapUs;
  int count = 0;
  int x;
  int y;

  SummaryLine toLine() {
    final gap = formatGap(gapUs);
    final detail = '$count 次，至 ($x, $y)';
    return SummaryLine(
      title: '鼠标移动',
      detail: gap.isEmpty ? detail : '$gap · $detail',
    );
  }
}

SummaryLine _lineFor(InputEvent event, int gapUs) {
  final gap = formatGap(gapUs);
  late final String title;
  late final String detail;
  switch (event.type) {
    case kEvButton:
      final pressed = event.code != 0;
      title = '${buttonName(event.flags)}${pressed ? '按下' : '松开'}';
      detail = '(${event.x}, ${event.y})';
      break;
    case kEvWheel:
      final parts = <String>[];
      if (event.w != 0) parts.add(event.w > 0 ? '向上 ${event.w}' : '向下 ${event.w.abs()}');
      if (event.z != 0) parts.add(event.z > 0 ? '向右 ${event.z}' : '向左 ${event.z.abs()}');
      title = '滚轮';
      detail = parts.isEmpty ? '(${event.x}, ${event.y})' : parts.join(' ');
      break;
    case kEvKey:
      final pressedKey = (event.flags & 1) != 0;
      title = pressedKey ? '按下 ${keyName(event.code)}' : '松开 ${keyName(event.code)}';
      detail = '';
      break;
    case kEvPad:
      title = '手柄${event.flags + 1}';
      detail = padDetail(event);
      break;
    default:
      title = '等待';
      detail = '';
  }
  return SummaryLine(
    title: title,
    detail: gap.isEmpty || detail.isEmpty
        ? (gap.isEmpty ? detail : gap)
        : '$gap · $detail',
  );
}

String buttonName(int button) {
  switch (button) {
    case 1:
      return '左键';
    case 2:
      return '右键';
    case 3:
      return '中键';
    case 4:
      return '侧键1';
    case 5:
      return '侧键2';
    default:
      return '按键$button';
  }
}

String keyName(int vk) {
  const named = <int, String>{
    0x08: 'Backspace',
    0x09: 'Tab',
    0x0D: 'Enter',
    0x10: 'Shift',
    0x11: 'Ctrl',
    0x12: 'Alt',
    0x13: 'Pause',
    0x14: 'CapsLock',
    0x1B: 'Esc',
    0x20: 'Space',
    0x21: 'PageUp',
    0x22: 'PageDown',
    0x23: 'End',
    0x24: 'Home',
    0x25: 'Left',
    0x26: 'Up',
    0x27: 'Right',
    0x28: 'Down',
    0x2C: 'PrintScreen',
    0x2D: 'Insert',
    0x2E: 'Delete',
    0x5B: 'Win',
    0x5C: 'Win',
    0xA0: '左Shift',
    0xA1: '右Shift',
    0xA2: '左Ctrl',
    0xA3: '右Ctrl',
    0xA4: '左Alt',
    0xA5: '右Alt',
  };
  final known = named[vk];
  if (known != null) return known;
  if (vk >= 0x30 && vk <= 0x39) return String.fromCharCode(vk);
  if (vk >= 0x41 && vk <= 0x5A) return String.fromCharCode(vk);
  if (vk >= 0x60 && vk <= 0x69) return 'Num${vk - 0x60}';
  if (vk >= 0x70 && vk <= 0x87) return 'F${vk - 0x6F}';
  return 'VK${vk.toRadixString(16).toUpperCase()}';
}

String padDetail(InputEvent event) {
  final names = <String>[];
  const bits = <int, String>{
    0x0001: '上',
    0x0002: '下',
    0x0004: '左',
    0x0008: '右',
    0x0010: 'Start',
    0x0020: 'Back',
    0x0040: 'LS',
    0x0080: 'RS',
    0x0100: 'LB',
    0x0200: 'RB',
    0x1000: 'A',
    0x2000: 'B',
    0x4000: 'X',
    0x8000: 'Y',
  };
  for (final entry in bits.entries) {
    if ((event.code & entry.key) != 0) names.add(entry.value);
  }
  final lt = event.v & 0xFFFF;
  final rt = (event.v >> 16) & 0xFFFF;
  if (lt > 0) names.add('LT $lt');
  if (rt > 0) names.add('RT $rt');
  if (event.x.abs() > 2000 || event.y.abs() > 2000) {
    names.add('左摇杆 ${event.x},${event.y}');
  }
  if (event.z.abs() > 2000 || event.w.abs() > 2000) {
    names.add('右摇杆 ${event.z},${event.w}');
  }
  if (names.isEmpty) return '回中';
  return names.join(' ');
}
