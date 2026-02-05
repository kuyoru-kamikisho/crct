import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';

class ExternalProcessManager with ChangeNotifier {
  // 进程实例
  Process? _process;

  // 运行状态 - 使用ChangeNotifier自动通知UI
  bool _isRunning = false;
  bool get isRunning => _isRunning;

  // 进程输出流（可选，用于调试）
  // Stream<String>? get outputStream => _process?.stdout
  //     .transform(const Utf8Decoder())
  //     .transform(const LineSplitter());

  // 错误流（可选，用于调试）
  // Stream<String>? get errorStream => _process?.stderr
  //     .transform(const Utf8Decoder())
  //     .transform(const LineSplitter());

  /// 执行外部exe程序
  /// [exePath]: 程序文件路径，如 './a.exe'
  /// [args]: 命令行参数，如 ['-s', 'p100', '-t', '10']
  Future<bool> startProcess(String exePath, {List<String>? args}) async {
    try {
      // 检查文件是否存在
      final file = File(exePath);
      if (!await file.exists()) {
        print('文件不存在: $exePath');
        return false;
      }

      // 清理之前的进程（如果存在）
      await _killProcess();

      // 启动新进程
      _process = await Process.start(exePath, args ?? []);

      // 设置运行状态并通知监听者
      _isRunning = true;
      notifyListeners();

      // 监听进程退出
      _process!.exitCode
          .then((code) {
            _isRunning = false;
            notifyListeners();
            print('进程已退出，退出码: $code');
          })
          .catchError((error) {
            _isRunning = false;
            notifyListeners();
            print('进程异常: $error');
          });

      return true;
    } catch (e) {
      print('启动进程失败: $e');
      _isRunning = false;
      notifyListeners();
      return false;
    }
  }

  /// 结束运行中的进程
  Future<bool> stopProcess() async {
    return await _killProcess();
  }

  /// 内部方法：杀死进程
  Future<bool> _killProcess() async {
    if (_process != null) {
      try {
        // 先尝试正常终止
        _process!.kill();

        // 等待一段时间让进程正常退出
        bool killed = false;
        await Future.any([
          _process!.exitCode.then((_) => killed = true),
          Future.delayed(const Duration(seconds: 2), () => false),
        ]);

        // 如果还没退出，强制终止
        if (!killed) {
          _process!.kill(ProcessSignal.sigkill);
        }

        _process = null;
        _isRunning = false;
        notifyListeners();
        return true;
      } catch (e) {
        print('终止进程失败: $e');
        return false;
      }
    }
    return false;
  }

  /// 发送输入到进程（如果需要与进程交互）
  Future<void> sendInput(String input) async {
    if (_process != null && _isRunning) {
      try {
        _process!.stdin.writeln(input);
      } catch (e) {
        print('发送输入失败: $e');
      }
    }
  }

  /// 清理资源
  void dispose() {
    _killProcess();
    super.dispose();
  }
}
