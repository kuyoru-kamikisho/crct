import 'dart:io';

import '../util.dart';

class UpdateService {
  Future<String?> fetchRemoteVersion(String url) async {
    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 8);
    try {
      final request = await client.getUrl(Uri.parse(url)).timeout(const Duration(seconds: 8));
      request.headers.set(HttpHeaders.userAgentHeader, 'Kacher');
      final response = await request.close().timeout(const Duration(seconds: 12));
      if (response.statusCode != 200) return null;
      final body = await response.take(64).fold<List<int>>(
        <int>[],
        (previous, chunk) => previous..addAll(chunk),
      );
      return parseRemoteVersion(String.fromCharCodes(body));
    } finally {
      client.close(force: true);
    }
  }

  Future<File> download(String url, String destPath) async {
    final file = File(destPath);
    if (await file.exists()) await file.delete();
    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 8);
    IOSink? sink;
    try {
      final request = await client.getUrl(Uri.parse(url)).timeout(const Duration(seconds: 8));
      request.headers.set(HttpHeaders.userAgentHeader, 'Kacher');
      final response = await request.close().timeout(const Duration(seconds: 20));
      if (response.statusCode != 200) {
        throw HttpException('下载失败，HTTP ${response.statusCode}', uri: Uri.parse(url));
      }
      sink = file.openWrite();
      await response.pipe(sink);
      sink = null;
      final length = await file.length();
      if (length < 50000) {
        throw const FileSystemException('下载的文件过小');
      }
      final header = await file.openRead(0, 2).first;
      if (header.length < 2 || header[0] != 0x4d || header[1] != 0x5a) {
        throw const FileSystemException('下载的文件不是可执行程序');
      }
      return file;
    } catch (_) {
      if (sink != null) {
        await sink.close();
      }
      if (await file.exists()) await file.delete();
      rethrow;
    } finally {
      client.close(force: true);
    }
  }

  Future<void> launchSwap({
    required int pid,
    required String source,
    required String destination,
    required String scriptPath,
  }) async {
    final script = File(scriptPath);
    await script.writeAsString(_script);
    await Process.start(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-WindowStyle',
        'Hidden',
        '-File',
        script.path,
        '$pid',
        source,
        destination,
      ],
      mode: ProcessStartMode.detached,
    );
  }
}

const String _script = r'''
param(
  [Parameter(Mandatory = $true)][int]$TargetPid,
  [Parameter(Mandatory = $true)][string]$Src,
  [Parameter(Mandatory = $true)][string]$Dst
)
try { Wait-Process -Id $TargetPid -ErrorAction SilentlyContinue } catch {}
Start-Sleep -Milliseconds 600
Copy-Item -LiteralPath $Src -Destination $Dst -Force
if (Test-Path -LiteralPath $Src) {
  Remove-Item -LiteralPath $Src -Force -ErrorAction SilentlyContinue
}
Start-Process -FilePath $Dst
''';
