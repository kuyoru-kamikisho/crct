import 'dart:io';
import 'dart:math' as math;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/widgets.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// 设备与应用信息采集。
class DeviceService {
  DeviceService._();
  static final DeviceService instance = DeviceService._();

  PackageInfo? _packageInfo;
  AndroidDeviceInfo? _androidInfo;

  Future<void> init() async {
    _packageInfo ??= await PackageInfo.fromPlatform();
    if (Platform.isAndroid) {
      _androidInfo ??= await DeviceInfoPlugin().androidInfo;
    }
  }

  Future<PackageInfo> get packageInfo async {
    _packageInfo ??= await PackageInfo.fromPlatform();
    return _packageInfo!;
  }

  Future<String> get appVersion async => (await packageInfo).version;

  Future<Map<String, dynamic>> collect(BuildContext? context) async {
    await init();
    final pkg = _packageInfo!;
    final views = WidgetsBinding.instance.platformDispatcher.views;
    final view = views.isNotEmpty ? views.first : null;
    final pixelRatio = view?.devicePixelRatio ?? 1.0;
    final logical = view?.physicalSize ?? Size.zero;
    final physicalW = logical.width;
    final physicalH = logical.height;
    final logicalW = physicalW / pixelRatio;
    final logicalH = physicalH / pixelRatio;

    double? screenWidthInch;
    double? screenHeightInch;
    double? screenDiagonalInch;
    if (context != null && context.mounted) {
      final mq = MediaQuery.maybeOf(context);
      if (mq != null) {
        final dpi = mq.devicePixelRatio * 160;
        if (dpi > 0) {
          screenWidthInch = physicalW / dpi;
          screenHeightInch = physicalH / dpi;
          screenDiagonalInch = math.sqrt(
            screenWidthInch * screenWidthInch +
                screenHeightInch * screenHeightInch,
          );
        }
      }
    }

    final android = _androidInfo;
    return {
      'appName': pkg.appName,
      'packageName': pkg.packageName,
      'appVersion': pkg.version,
      'buildNumber': pkg.buildNumber,
      'platform': Platform.operatingSystem,
      'platformVersion': Platform.operatingSystemVersion,
      'screen': {
        'physicalWidth': physicalW,
        'physicalHeight': physicalH,
        'logicalWidth': logicalW,
        'logicalHeight': logicalH,
        'devicePixelRatio': pixelRatio,
        'widthInch': screenWidthInch,
        'heightInch': screenHeightInch,
        'diagonalInch': screenDiagonalInch,
      },
      'android': android == null
          ? null
          : {
              'brand': android.brand,
              'manufacturer': android.manufacturer,
              'model': android.model,
              'device': android.device,
              'product': android.product,
              'hardware': android.hardware,
              'board': android.board,
              'androidId': android.id,
              'isPhysicalDevice': android.isPhysicalDevice,
              'sdkInt': android.version.sdkInt,
              'release': android.version.release,
              'securityPatch': android.version.securityPatch,
              'supportedAbis': android.supportedAbis,
            },
    };
  }
}
