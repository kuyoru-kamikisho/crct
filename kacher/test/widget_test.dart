import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:kacher/format/krec.dart';
import 'package:kacher/util.dart';

void main() {
  test('版本号只比较三段数字', () {
    expect(compareVersion('1.0.0', '1.0.1'), lessThan(0));
    expect(compareVersion('1.2.0+4', '1.2.0'), 0);
    expect(compareVersion('v2.0.0', '1.9.9'), greaterThan(0));
    expect(parseRemoteVersion('1.4.2\n'), '1.4.2');
    expect(parseRemoteVersion('version=3.0.1'), '3.0.1');
  });

  test('文件名去掉不能用的字符', () {
    expect(sanitizeFileName('a/b:c'), 'a_b_c');
    expect(sanitizeFileName('  '), '未命名');
    expect(sanitizeFileName('_cache'), '未命名');
  });

  test('录制文件头可以读回名称和播放设置', () {
    final bytes = _header(
      name: '测试操作',
      eventCount: 3,
      durationUs: 2500000,
      createdMs: 1700000000000,
      mode: kAfterLoop,
      interval: 1500,
      count: 4,
      flags: 1,
    );
    final meta = Krec.parseHeader(bytes, r'D:\rec\测试.krec');
    expect(meta, isNotNull);
    expect(meta!.name, '测试操作');
    expect(meta.eventCount, 3);
    expect(meta.durationUs, 2500000);
    expect(meta.playbackMode, kAfterLoop);
    expect(meta.loopIntervalMs, 1500);
    expect(meta.loopCount, 4);
    expect(meta.hasGamepad, isTrue);
    expect(meta.created.millisecondsSinceEpoch, 1700000000000);
  });

  test('连续鼠标移动合并成一条，并保留间隔', () {
    final lines = summarizeEvents([
      _event(type: kEvMove, dtUs: 500000, x: 1, y: 2),
      _event(type: kEvMove, dtUs: 8000, x: 9, y: 8),
      _event(type: kEvButton, dtUs: 400000, flags: 1, code: 1, x: 9, y: 8),
      _event(type: kEvKey, dtUs: 1000, flags: 1, code: 0x41),
    ]);
    expect(lines, hasLength(3));
    expect(lines[0].title, '鼠标移动');
    expect(lines[0].detail, contains('2 次'));
    expect(lines[0].detail, contains('间隔 500 毫秒'));
    expect(lines[1].title, '左键按下');
    expect(lines[1].detail, contains('间隔'));
    expect(lines[2].title, '按下 A');
  });
}

Uint8List _header({
  required String name,
  int eventCount = 0,
  int durationUs = 0,
  int createdMs = 0,
  int mode = 0,
  int interval = 0,
  int count = 0,
  int flags = 0,
}) {
  final bytes = Uint8List(kHeaderSize);
  final data = ByteData.sublistView(bytes);
  bytes[0] = 0x4b;
  bytes[1] = 0x52;
  bytes[2] = 0x45;
  bytes[3] = 0x43;
  data.setUint32(4, 1, Endian.little);
  data.setUint32(8, kHeaderSize, Endian.little);
  data.setUint32(12, eventCount, Endian.little);
  data.setUint64(20, durationUs, Endian.little);
  data.setUint64(28, createdMs, Endian.little);
  data.setUint32(36, mode, Endian.little);
  data.setUint32(40, interval, Endian.little);
  data.setUint32(44, count, Endian.little);
  data.setUint32(48, flags, Endian.little);
  final encoded = utf8.encode(name);
  bytes.setRange(52, 52 + encoded.length, encoded);
  return bytes;
}

InputEvent _event({
  required int type,
  int dtUs = 0,
  int flags = 0,
  int code = 0,
  int x = 0,
  int y = 0,
  int z = 0,
  int w = 0,
  int v = 0,
}) {
  return InputEvent(
    dtUs: dtUs,
    type: type,
    flags: flags,
    code: code,
    x: x,
    y: y,
    z: z,
    w: w,
    v: v,
  );
}
