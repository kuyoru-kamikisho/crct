import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'device_service.dart';
import 'log_service.dart';

class PendingUpdate {
  PendingUpdate({
    required this.version,
    required this.downloadUrl,
    required this.updateLog,
    required this.apkPath,
    required this.downloadedAt,
  });

  final String version;
  final String downloadUrl;
  final String updateLog;
  final String apkPath;
  final String downloadedAt;

  factory PendingUpdate.fromJson(Map<String, dynamic> json) {
    return PendingUpdate(
      version: json['version'] as String? ?? '',
      downloadUrl: json['download_url'] as String? ?? '',
      updateLog: json['update_log'] as String? ?? '',
      apkPath: json['apkPath'] as String? ?? '',
      downloadedAt: json['downloadedAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'version': version,
        'download_url': downloadUrl,
        'update_log': updateLog,
        'apkPath': apkPath,
        'downloadedAt': downloadedAt,
      };
}

/// 静默检查 / 下载 APK，下次启动提示安装。
class UpdateService {
  UpdateService._();
  static final UpdateService instance = UpdateService._();

  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(minutes: 5),
    sendTimeout: const Duration(seconds: 15),
  ));

  bool _checking = false;
  bool get isChecking => _checking;

  Future<Directory> _updatesDir() async {
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory(p.join(docs.path, 'updates'));
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  Future<File> _pendingMetaFile() async {
    final dir = await _updatesDir();
    return File(p.join(dir.path, 'pending_update.json'));
  }

  Future<PendingUpdate?> loadPending() async {
    try {
      final file = await _pendingMetaFile();
      if (!await file.exists()) return null;
      final map = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
      final pending = PendingUpdate.fromJson(map);
      final apk = File(pending.apkPath);
      if (!await apk.exists()) {
        await clearPending();
        return null;
      }
      final current = await DeviceService.instance.appVersion;
      if (!_isNewer(pending.version, current)) {
        await clearPending();
        return null;
      }
      return pending;
    } catch (e) {
      debugPrint('UpdateService.loadPending error: $e');
      return null;
    }
  }

  Future<void> clearPending() async {
    try {
      final meta = await _pendingMetaFile();
      if (await meta.exists()) await meta.delete();
      final dir = await _updatesDir();
      final apk = File(p.join(dir.path, 'pending.apk'));
      if (await apk.exists()) await apk.delete();
    } catch (e) {
      debugPrint('UpdateService.clearPending error: $e');
    }
  }

  /// 后台静默检查并下载（不安装）。
  Future<void> checkAndDownloadSilent(String updateUrl) async {
    final base = updateUrl.trim();
    if (base.isEmpty || _checking) return;
    _checking = true;
    try {
      final versionUrl = _joinUrl(base, 'version.json');
      await LogService.instance.info('检查更新: $versionUrl');
      final resp = await _dio.get<dynamic>(versionUrl);
      final data = resp.data;
      final Map<String, dynamic> json;
      if (data is Map<String, dynamic>) {
        json = data;
      } else if (data is String) {
        json = jsonDecode(data) as Map<String, dynamic>;
      } else {
        throw StateError('version.json 格式无效');
      }

      final remoteVersion = json['version']?.toString() ?? '';
      final downloadUrl = json['download_url']?.toString() ?? '';
      final updateLog = json['update_log']?.toString() ?? '';
      if (remoteVersion.isEmpty || downloadUrl.isEmpty) {
        throw StateError('version.json 缺少 version 或 download_url');
      }

      final current = await DeviceService.instance.appVersion;
      if (!_isNewer(remoteVersion, current)) {
        await LogService.instance.info('已是最新版本: $current');
        return;
      }

      final existing = await loadPending();
      if (existing != null && existing.version == remoteVersion) {
        await LogService.instance.info('更新包已下载: $remoteVersion');
        return;
      }

      final dir = await _updatesDir();
      final apkPath = p.join(dir.path, 'pending.apk');
      await LogService.instance.info('开始下载更新: $downloadUrl');
      await _dio.download(downloadUrl, apkPath);
      final pending = PendingUpdate(
        version: remoteVersion,
        downloadUrl: downloadUrl,
        updateLog: updateLog,
        apkPath: apkPath,
        downloadedAt: DateTime.now().toIso8601String(),
      );
      final meta = await _pendingMetaFile();
      await meta.writeAsString(
        const JsonEncoder.withIndent('  ').convert(pending.toJson()),
      );
      await LogService.instance.info('更新下载完成: $remoteVersion');
    } catch (e, st) {
      await LogService.instance.warn('更新检查失败: $e');
      debugPrint('UpdateService.checkAndDownloadSilent: $e\n$st');
    } finally {
      _checking = false;
    }
  }

  Future<bool> installPending(PendingUpdate pending) async {
    try {
      final result = await OpenFilex.open(
        pending.apkPath,
        type: 'application/vnd.android.package-archive',
      );
      await LogService.instance.info(
        '调起安装: ${pending.version}, result=${result.type} ${result.message}',
      );
      return result.type == ResultType.done;
    } catch (e) {
      await LogService.instance.error('安装失败: $e');
      return false;
    }
  }

  /// 语义化比较：a > b 返回 true。支持 x.y.z 数字段。
  bool _isNewer(String a, String b) {
    final pa = _parseVersion(a);
    final pb = _parseVersion(b);
    final len = math.max(pa.length, pb.length);
    for (var i = 0; i < len; i++) {
      final av = i < pa.length ? pa[i] : 0;
      final bv = i < pb.length ? pb[i] : 0;
      if (av > bv) return true;
      if (av < bv) return false;
    }
    return false;
  }

  List<int> _parseVersion(String v) {
    final cleaned = v.trim().split(RegExp(r'[^0-9.]')).first;
    return cleaned
        .split('.')
        .where((e) => e.isNotEmpty)
        .map((e) => int.tryParse(e) ?? 0)
        .toList();
  }

  String _joinUrl(String base, String path) {
    if (base.endsWith('/')) return '$base$path';
    return '$base/$path';
  }
}
