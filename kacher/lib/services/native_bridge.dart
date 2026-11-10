import 'package:flutter/services.dart';

class CaptureResult {
  const CaptureResult({
    required this.eventCount,
    required this.durationUs,
    required this.hasGamepad,
    required this.dropped,
  });

  final int eventCount;
  final int durationUs;
  final bool hasGamepad;
  final int dropped;

  static CaptureResult fromMap(Map<String, dynamic> map) {
    return CaptureResult(
      eventCount: _int(map['eventCount']),
      durationUs: _int(map['durationUs']),
      hasGamepad: map['hasGamepad'] == true,
      dropped: _int(map['dropped']),
    );
  }
}

class PlayStart {
  const PlayStart({required this.gamepadSkipped});

  final bool gamepadSkipped;
}

class NativeBridge {
  final MethodChannel _channel = const MethodChannel('kacher/native');
  void Function(String method, Object? args)? onEvent;

  void bind() {
    _channel.setMethodCallHandler((call) async {
      onEvent?.call(call.method, call.arguments);
    });
  }

  Future<String> exeDir() async => (await _channel.invokeMethod<String>('exeDir')) ?? '';

  Future<String> fileVersion() async =>
      (await _channel.invokeMethod<String>('fileVersion')) ?? '';

  Future<String> readFileVersion(String path) async =>
      (await _channel.invokeMethod<String>('readFileVersion', {'path': path})) ?? '';

  Future<void> setStartup(bool enabled) async {
    await _channel.invokeMethod<void>('setStartup', {'enabled': enabled});
  }

  Future<void> minimize() => _channel.invokeMethod<void>('minimize');

  Future<void> restore() => _channel.invokeMethod<void>('restore');

  Future<void> showOverlay({
    required String mode,
    required String title,
    required String subtitle,
  }) {
    return _channel.invokeMethod<void>('showOverlay', {
      'mode': mode,
      'title': title,
      'subtitle': subtitle,
    });
  }

  Future<void> updateOverlay({required String title, required String subtitle}) {
    return _channel.invokeMethod<void>('updateOverlay', {
      'title': title,
      'subtitle': subtitle,
    });
  }

  Future<void> hideOverlay() => _channel.invokeMethod<void>('hideOverlay');

  Future<void> beginCapture(String path, String name) {
    return _channel.invokeMethod<void>('beginCapture', {'path': path, 'name': name});
  }

  Future<CaptureResult> endCapture() async {
    final raw = await _channel.invokeMapMethod<String, dynamic>('endCapture');
    return CaptureResult.fromMap(raw ?? {});
  }

  Future<PlayStart> play({
    required String path,
    required int after,
    required int intervalMs,
    required int count,
    required int token,
  }) async {
    final raw = await _channel.invokeMapMethod<String, dynamic>('play', {
      'path': path,
      'after': after,
      'intervalMs': intervalMs,
      'count': count,
      'token': token,
    });
    return PlayStart(gamepadSkipped: raw?['gamepadSkipped'] == true);
  }

  Future<void> setPaused(bool paused) {
    return _channel.invokeMethod<void>('setPaused', {'paused': paused});
  }

  Future<void> stopPlayback() => _channel.invokeMethod<void>('stopPlayback');

  Future<bool> shutdown() async => (await _channel.invokeMethod<bool>('shutdown')) ?? false;

  Future<void> updateMeta({
    required String path,
    required String name,
    required int playbackMode,
    required int loopIntervalMs,
    required int loopCount,
    bool repair = false,
  }) {
    return _channel.invokeMethod<void>('updateMeta', {
      'path': path,
      'name': name,
      'playbackMode': playbackMode,
      'loopIntervalMs': loopIntervalMs,
      'loopCount': loopCount,
      'repair': repair,
    });
  }
}

int _int(Object? value) => value is num ? value.toInt() : 0;
