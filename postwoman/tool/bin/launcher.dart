import 'dart:convert';
import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';

import 'package:archive/archive.dart';

const _magic = 'PWPACK01';

void main() {
  try {
    _run();
  } catch (e, st) {
    stderr.writeln('Postwoman 启动失败：$e');
    stderr.writeln('$st');
    sleep(const Duration(seconds: 6));
    exit(1);
  }
}

void _run() {
  final self = File(Platform.resolvedExecutable);
  final bytes = self.readAsBytesSync();
  if (bytes.length < 24) {
    throw StateError('文件不完整');
  }
  final magic = ascii.decode(bytes.sublist(bytes.length - 8));
  if (magic != _magic) {
    throw StateError('不是打包后的 Postwoman 单文件（缺少 payload）');
  }
  final sizeView = ByteData.sublistView(Uint8List.fromList(bytes.sublist(bytes.length - 16, bytes.length - 8)));
  final zipSize = sizeView.getUint64(0, Endian.little);
  if (zipSize <= 0 || zipSize > bytes.length - 16) {
    throw StateError('payload 大小异常: $zipSize');
  }
  final zipStart = bytes.length - 16 - zipSize;
  final zipBytes = bytes.sublist(zipStart, zipStart + zipSize);

  final tempRoot = Platform.environment['TEMP'] ?? Directory.systemTemp.path;
  final dest = Directory(
    '$tempRoot${Platform.pathSeparator}postwoman_run${Platform.pathSeparator}$zipSize',
  );
  final exe = File('${dest.path}${Platform.pathSeparator}postwoman.exe');
  final stamp = File('${dest.path}${Platform.pathSeparator}.payload_size');
  final needExtract = !exe.existsSync() || !stamp.existsSync() || stamp.readAsStringSync() != '$zipSize';

  if (needExtract) {
    if (dest.existsSync()) {
      dest.deleteSync(recursive: true);
    }
    dest.createSync(recursive: true);
    final archive = ZipDecoder().decodeBytes(zipBytes);
    for (final file in archive) {
      final name = file.name.replaceAll('/', Platform.pathSeparator);
      final outPath = '${dest.path}${Platform.pathSeparator}$name';
      if (file.isFile) {
        final out = File(outPath);
        out.parent.createSync(recursive: true);
        out.writeAsBytesSync(file.content as List<int>);
      } else {
        Directory(outPath).createSync(recursive: true);
      }
    }
    stamp.writeAsStringSync('$zipSize');
  }

  if (!exe.existsSync()) {
    throw StateError('解压后未找到 postwoman.exe');
  }

  _hideConsole();
  Process.start(
    exe.path,
    const [],
    workingDirectory: dest.path,
    mode: ProcessStartMode.detached,
  );
}

void _hideConsole() {
  try {
    final k32 = DynamicLibrary.open('kernel32.dll');
    final fn = k32.lookupFunction<Int32 Function(), int Function()>('FreeConsole');
    fn();
  } catch (_) {}
}
