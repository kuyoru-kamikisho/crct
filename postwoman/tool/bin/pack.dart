import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:archive/archive_io.dart';

const _magic = 'PWPACK01';

Future<void> main(List<String> args) async {
  final skipBuild = args.contains('--skip-build');
  final root = _findRoot();
  stdout.writeln('项目目录：${root.path}');

  if (!skipBuild) {
    stdout.writeln('正在编译 Flutter Windows Release...');
    final build = await Process.run(
      'flutter',
      ['build', 'windows', '--release'],
      workingDirectory: root.path,
      runInShell: true,
    );
    stdout.write(build.stdout);
    stderr.write(build.stderr);
    if (build.exitCode != 0) {
      exit(build.exitCode);
    }
  }

  final release = _findReleaseDir(root);
  stdout.writeln('Release 目录：$release');
  _copyVcRedist(release);

  final dist = Directory('${root.path}${Platform.pathSeparator}dist');
  if (!dist.existsSync()) dist.createSync(recursive: true);

  final zipPath = '${dist.path}${Platform.pathSeparator}payload.zip';
  if (File(zipPath).existsSync()) File(zipPath).deleteSync();
  stdout.writeln('正在打包 payload...');
  final encoder = ZipFileEncoder();
  encoder.create(zipPath);
  encoder.addDirectory(Directory(release), includeDirName: false);
  encoder.close();

  final toolDir = Directory('${root.path}${Platform.pathSeparator}tool');
  final launcherOut = '${dist.path}${Platform.pathSeparator}launcher.exe';
  stdout.writeln('正在编译启动器...');
  final compile = await Process.run(
    'dart',
    ['compile', 'exe', 'bin${Platform.pathSeparator}launcher.dart', '-o', launcherOut],
    workingDirectory: toolDir.path,
    runInShell: true,
  );
  stdout.write(compile.stdout);
  stderr.write(compile.stderr);
  if (compile.exitCode != 0) {
    exit(compile.exitCode);
  }

  final launcherBytes = File(launcherOut).readAsBytesSync();
  final zipBytes = File(zipPath).readAsBytesSync();
  final size = ByteData(8)..setUint64(0, zipBytes.length, Endian.little);
  final out = BytesBuilder(copy: false)
    ..add(launcherBytes)
    ..add(zipBytes)
    ..add(size.buffer.asUint8List())
    ..add(ascii.encode(_magic));

  final exePath = '${dist.path}${Platform.pathSeparator}postwoman.exe';
  File(exePath).writeAsBytesSync(out.takeBytes());
  File(launcherOut).deleteSync();
  File(zipPath).deleteSync();

  final sizeMb = (File(exePath).lengthSync() / (1024 * 1024)).toStringAsFixed(1);
  stdout.writeln('完成：$exePath  ($sizeMb MB)');
  stdout.writeln('该文件可单独复制到任意目录运行，无需附带 dll。');
}

Directory _findRoot() {
  var dir = Directory.current;
  for (var i = 0; i < 8; i++) {
    final pubspec = File('${dir.path}${Platform.pathSeparator}pubspec.yaml');
    if (pubspec.existsSync()) {
      final text = pubspec.readAsStringSync();
      if (text.contains('name: postwoman') && !text.contains('name: postwoman_pack')) {
        return dir;
      }
    }
    dir = dir.parent;
  }
  throw StateError('找不到 postwoman 项目根目录，请在仓库内运行');
}

String _findReleaseDir(Directory root) {
  final candidates = [
    '${root.path}${Platform.pathSeparator}build${Platform.pathSeparator}windows${Platform.pathSeparator}x64${Platform.pathSeparator}runner${Platform.pathSeparator}Release',
    '${root.path}${Platform.pathSeparator}build${Platform.pathSeparator}windows${Platform.pathSeparator}runner${Platform.pathSeparator}Release',
  ];
  for (final c in candidates) {
    final exe = File('$c${Platform.pathSeparator}postwoman.exe');
    if (exe.existsSync()) return c;
  }
  throw StateError('未找到 Release 产物，请先 flutter build windows --release');
}

void _copyVcRedist(String release) {
  const names = [
    'msvcp140.dll',
    'vcruntime140.dll',
    'vcruntime140_1.dll',
  ];
  final sys = '${Platform.environment['SystemRoot'] ?? r'C:\Windows'}${Platform.pathSeparator}System32';
  for (final name in names) {
    final dest = File('$release${Platform.pathSeparator}$name');
    if (dest.existsSync()) continue;
    final src = File('$sys${Platform.pathSeparator}$name');
    if (src.existsSync()) {
      src.copySync(dest.path);
      stdout.writeln('已附带 $name');
    }
  }
}
