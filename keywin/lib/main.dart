import 'package:flutter/material.dart';
import 'package:keywin/store/main_provider.dart';
import 'package:provider/provider.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => EventRecordProvider()),
        ChangeNotifierProvider(create: (_) => FileListProvider()),
      ],
      child: const MainApp(),
    ),
  );
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    final eventRecords = Provider.of<EventRecordProvider>(context);
    final fileList = Provider.of<FileListProvider>(context);

    return MaterialApp(
      home: Scaffold(
        body: Row(
          children: [
            Container(
              width: 300,
              color: Colors.black26,
              padding: EdgeInsets.all(12),
              margin: EdgeInsets.only(right: 4),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('这是一个用于“测试按键操作监听、复现”的专用项目，期望目标如下：'),
                  Text('1. 可以实现键盘、鼠标动作的监听'),
                  Text('2. 将监听结果实时存储到设备硬盘里面，用于根据该数据文件复现'),
                  Text('3. 支持文件命名，并根据文件名重新生成“已录制的文件列表”并展示出来'),
                  Text('4. 点击某个复现文件，可以实现动作重现'),
                  Text('5. 支持循环'),
                  Text('6. 支持结束后关机'),
                  Text('7. 支持定时自动执行'),
                  Text('8. 尽量低的内存占用'),
                  Text('9. 尽量快的响应速度'),
                  Text('10. 以上为本期的实现目标。'),
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
                      Text('这里是按钮区域'),
                      Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        alignment: WrapAlignment.start,
                        children: [
                          CommonBtn(child: Text('启动监听'), onTap: () {}),
                          CommonBtn(child: Text('结束监听'), onTap: () {}),
                          CommonBtn(child: Text('保存此文件'), onTap: () {}),
                          CommonBtn(child: Text('删除此文件'), onTap: () {}),
                          CommonBtn(child: Text('查询已记录文件'), onTap: () {}),
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
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start,children: [
                    Text('这里是已记录的文件展示区域'),
                    Wrap(
                        alignment: WrapAlignment.start,
                        children: fileList.fileList.isEmpty
                            ? [const Text('暂无数据')]
                            : fileList.fileList
                                  .map((str) => Text(str))
                                  .toList(),
                      ),
                  ]),
                ),
              ],
            ),
            Column(
              children: [
                Container(
                  width: 300,
                  padding: EdgeInsets.all(12),
                  color: Colors.black26,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('这里是监听日志区域'),
                      Wrap(
                        alignment: WrapAlignment.start,
                        children: eventRecords.eventsRecord.isEmpty
                            ? [const Text('暂无数据')]
                            : eventRecords.eventsRecord
                                  .map((str) => Text(str))
                                  .toList(),
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
