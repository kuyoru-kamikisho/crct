import 'dart:async';

import 'package:flutter/material.dart';
import 'package:keywin/outexe/key_monitor.dart';
import 'package:keywin/store/main_provider.dart';
import 'package:provider/provider.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => EventRecordProvider()),
        ChangeNotifierProvider(create: (_) => FileListProvider()),
        ChangeNotifierProvider(
          create: (_) {
            var appInfo = AppInfoProvider();
            appInfo.loadAppDir();
            return appInfo;
          },
        ),
        ChangeNotifierProvider(create: (_) => KeyMonitorWsConnector()),
      ],
      child: const MainApp(),
    ),
  );
}

class MainApp extends StatefulWidget {
  const MainApp({super.key});

  @override
  State<MainApp> createState() => _MainAppState();
}

class _MainAppState extends State<MainApp> {
  final ScrollController _scrollController = ScrollController();
  final List<String> _pendingMessages = [];
  Timer? _flushTimer;
  static const Duration _flushInterval = Duration(milliseconds: 50);

  @override
  void initState() {
    super.initState();
    // 监听事件变化，滚动到底部
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      }
    });
  }

  @override
  void dispose() {
    _flushTimer?.cancel();
    _flushTimer = null;
    _pendingMessages.clear();
    _scrollController.dispose();
    super.dispose();
  }

  void _flushPendingMessages(EventRecordProvider eventRecords) {
    if (_pendingMessages.isEmpty) {
      _flushTimer?.cancel();
      _flushTimer = null;
      return;
    }
    eventRecords.addEventStrings(List<String>.from(_pendingMessages));
    _pendingMessages.clear();
    _flushTimer?.cancel();
    _flushTimer = null;
  }

  @override
  Widget build(BuildContext context) {
    print('渲染+');
    final eventRecords = Provider.of<EventRecordProvider>(context);
    final fileList = Provider.of<FileListProvider>(context);
    final appInfo = Provider.of<AppInfoProvider>(context);
    final keyMonitor = Provider.of<KeyMonitorWsConnector>(context);

    // 当事件记录变化时，滚动到底部
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });

    return MaterialApp(
      home: Scaffold(
        body: Row(
          children: [
            Container(
              width: 300,
              color: Colors.black26,
              padding: EdgeInsets.all(12),
              margin: EdgeInsets.only(right: 4),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('这是一个用于“测试按键操作监听、复现”的专用项目，期望目标如下：'),
                  const Text('1. 可以实现键盘、鼠标动作的监听'),
                  const Text('2. 将监听结果实时存储到设备硬盘里面，用于根据该数据文件复现'),
                  const Text('3. 支持文件命名，并根据文件名重新生成“已录制的文件列表”并展示出来'),
                  const Text('4. 点击某个复现文件，可以实现动作现'),
                  const Text('5. 支持循环'),
                  const Text('6. 支持结束后关闭'),
                  const Text('7. 支持定时自动执行'),
                  const Text('8. 尽量低的内存占用'),
                  const Text('9. 尽量快的响应速度'),
                  const Text('10. 以上为本期的实现目标'),
                  const Text('\n'),
                  Text('当前应用运行所在目录：${appInfo.appDir}'),
                  Text('插件1：${appInfo.keyMonitorExePath}'),
                ],
              ),
            ),
            Column(
              children: [
                Container(
                  width: 300,
                  padding: EdgeInsets.all(12),
                  margin: EdgeInsets.only(right: 4, bottom: 4),
                  color: Colors.black26,
                  child: Column(
                    children: [
                      const Text('这里是按钮区'),
                      Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        alignment: WrapAlignment.start,
                        children: [
                          CommonBtn(
                            child: Text(keyMonitor.connected ? '已连' : '启动监听'),
                            onTap: () {
                              keyMonitor.epmForKeyMonitor
                                  .startProcess(
                                    appInfo.keyMonitorExePath,
                                    args: ['-m', 'ws', '-p', keyMonitor.port],
                                  )
                                  .then((b) {
                                    if (b) {
                                      eventRecords.resetEventRecord();
                                      print('已启动插件1');
                                      keyMonitor.onMessage = (message) {
                                        _pendingMessages.add(message);
                                        _flushTimer ??= Timer(
                                          _flushInterval,
                                          () => _flushPendingMessages(
                                            eventRecords,
                                          ),
                                        );
                                      };
                                      keyMonitor.startConnectWs();
                                    }
                                  });
                            },
                          ),
                          CommonBtn(
                            child: const Text('结束监听'),
                            onTap: () {
                              keyMonitor.closeMonitor();
                            },
                          ),
                          CommonBtn(child: const Text('保存此文件'), onTap: () {}),
                          CommonBtn(child: const Text('删除此文件'), onTap: () {}),
                          CommonBtn(child: const Text('查询已记录文件'), onTap: () {}),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 300,
                  padding: EdgeInsets.all(12),
                  margin: EdgeInsets.only(right: 4),
                  color: Colors.black26,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('这里是已记录的文件展示区域'),
                      Wrap(
                        alignment: WrapAlignment.start,
                        children: [
                          fileList.fileList.isEmpty
                              ? const Text('暂无数据')
                              : Text(
                                  fileList.fileList.join('\n'), // 用换行符连接所有字符串
                                  style: TextStyle(height: 1.5), // 调整行高，使换行更美�?
                                ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            // 右侧日志区域（可滚动�?
            Column(
              children: [
                Container(
                  width: 300,
                  height: MediaQuery.of(context).size.height * 0.9,
                  padding: EdgeInsets.all(12),
                  color: Colors.black26,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('这里是监听日志区域'),
                      Expanded(
                        child: ListView.builder(
                          controller: _scrollController,
                          itemCount: eventRecords.eventsRecord.length,
                          itemBuilder: (context, index) {
                            return Text(eventRecords.eventsRecord[index]);
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class CommonBtn extends StatefulWidget {
  final Widget? child;
  final VoidCallback? onTap;
  final Color? hoverColor;
  final Color? backgroundColor;
  final Color? borderColor;

  const CommonBtn({
    this.child,
    this.onTap,
    this.hoverColor,
    this.backgroundColor,
    this.borderColor,
    super.key,
  });

  @override
  State<CommonBtn> createState() => _CommonBtnState();
}

class _CommonBtnState extends State<CommonBtn> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
          decoration: BoxDecoration(
            color: _isHovered
                ? (widget.hoverColor ?? Colors.grey[200])
                : (widget.backgroundColor ?? Colors.transparent),
            border: Border.all(
              color: widget.borderColor ?? Colors.black,
              width: 1.0,
            ),
            borderRadius: BorderRadius.circular(4),
          ),
          child: widget.child,
        ),
      ),
    );
  }
}
