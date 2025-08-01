import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:multip/declares/schedule_o.dart';
import 'package:multip/states/my_app_state.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart' show rootBundle;

/// 任务计划表页面
class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  int tabIndex = 0;

  void setTabIndex(int x) {
    setState(() {
      tabIndex = x;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black54,
      child: Column(
        children: [
          ScheduleBar(activeTab: tabIndex),
          ScheduleTypePointer(onTabChange: setTabIndex),
          SchedulesContainer(activeTabIndex: tabIndex),
        ],
      ),
    );
  }
}

class ScheduleTypePointer extends StatefulWidget {
  const ScheduleTypePointer({super.key, required this.onTabChange});
  final void Function(int) onTabChange;

  @override
  State<ScheduleTypePointer> createState() => _ScheduleTypePointerState();
}

class _ScheduleTypePointerState extends State<ScheduleTypePointer> {
  List<Map<String, dynamic>> types = [
    {'name': '定时任务', 'icon': Icons.alarm, 'active': true},
    {'name': '动作录制', 'icon': Icons.fitbit, 'active': false},
    {'name': '命令脚本', 'icon': Icons.terminal, 'active': false},
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        spacing: 5,
        children: [
          for (int i = 0; i < types.length; i++)
            SBtn(
              text: types[i]['name'],
              icon: types[i]['icon'],
              active: types[i]['active'],
              onPressed: () {
                setState(() {
                  for (var item in types) {
                    item['active'] = false;
                  }
                  types[i]['active'] = true;
                });
                widget.onTabChange(i);
              },
            ),
        ],
      ),
    );
  }
}

class SBtn extends StatefulWidget {
  const SBtn({
    super.key,
    this.text = '',
    this.active = false,
    this.icon,
    this.onPressed,
  });

  final bool active;
  final IconData? icon;
  final String text;
  final VoidCallback? onPressed;

  @override
  State<SBtn> createState() => _SBtnState();
}

class _SBtnState extends State<SBtn> {
  bool _isHovered = false;
  var animeTime = const Duration(microseconds: 300);

  @override
  Widget build(BuildContext context) {
    var txtColor = _isHovered
        ? Colors.white
        : widget.active
        ? Colors.white
        : Colors.white70;
    var bgColor = _isHovered
        ? Colors.black87
        : widget.active
        ? Colors.black87
        : Colors.black45;
    var borderColor = widget.active
        ? const Color.fromARGB(255, 24, 243, 123)
        : const Color.fromARGB(164, 32, 70, 240);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        decoration: BoxDecoration(
          color: bgColor,
          border: Border(left: BorderSide(width: 4, color: borderColor)),
        ),
        duration: animeTime,
        padding: EdgeInsets.symmetric(vertical: 2, horizontal: 10),
        child: InkWell(
          mouseCursor: SystemMouseCursors.click,
          hoverColor: Colors.transparent,
          onTap: widget.onPressed,
          splashColor: Colors.white10,
          child: Row(
            children: [
              AnimatedContainer(
                duration: animeTime,
                child: Text(
                  widget.text,
                  style: TextStyle(
                    fontSize: 14,
                    letterSpacing: 1,
                    color: txtColor,
                  ),
                ),
              ),
              SizedBox(width: 6),
              AnimatedContainer(
                duration: animeTime,
                child: Icon(widget.icon, size: 14, color: txtColor),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SchedulesContainer extends StatefulWidget {
  const SchedulesContainer({super.key, required this.activeTabIndex});
  final int activeTabIndex;

  @override
  State<SchedulesContainer> createState() => _SchedulesContainerState();
}

class _SchedulesContainerState extends State<SchedulesContainer> {
  @override
  Widget build(BuildContext context) {
    var scheduleMap = context.watch<MyAppState>().scheduleMap;
    final scrollController = ScrollController();

    if (scheduleMap == null) {
      _loadScheduleMap(context);
      return const CircularProgressIndicator();
    }

    return Expanded(
      child: Container(
        color: Colors.transparent,
        margin: EdgeInsets.only(bottom: 20, left: 20, right: 20, top: 8),
        child: ScrollConfiguration(
          behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
          child: RawScrollbar(
            thickness: 4,
            controller: scrollController,
            radius: Radius.circular(0),
            thumbColor: const Color.fromARGB(175, 228, 19, 71),
            child: ListView(
              controller: scrollController,
              shrinkWrap: true,
              children: [
                if (widget.activeTabIndex == 0)
                  for (TimerO time in scheduleMap.times)
                    MouseRegion(
                      onEnter: (_) => setState(() => time.hovering = true),
                      onExit: (_) => setState(() => time.hovering = false),
                      child: Container(
                        // 项目容器 A
                        margin: EdgeInsets.only(bottom: 6),
                        color: _backgroundColor(time.hovering),
                        child: Stack(
                          children: [
                            Positioned.fill(
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: FractionallySizedBox(
                                  widthFactor: time.progress, // 进度比例(0.0-1.0)
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: const Color.fromARGB(
                                        80,
                                        42,
                                        21,
                                        61,
                                      ),
                                      borderRadius: BorderRadius.circular(0),
                                    ),
                                    height: double.infinity,
                                  ),
                                ),
                              ),
                            ),
                            Padding(
                              padding: EdgeInsetsGeometry.symmetric(
                                vertical: 8,
                                horizontal: 12,
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    time.name,
                                    style: TextStyle(
                                      letterSpacing: 1,
                                      color: _foregeColor(time.hovering),
                                    ),
                                  ),
                                  IconButton(
                                    constraints: BoxConstraints(),
                                    padding: EdgeInsets.zero,
                                    onPressed: () {
                                      setState(() {
                                        if (time.running) {
                                          time.stop();
                                        } else {
                                          time.run(() => setState(() {}));
                                          context
                                              .read<MyAppState>()
                                              .addASchedule();
                                        }
                                      });
                                    },
                                    icon: Icon(
                                      time.running
                                          ? Icons.stop_circle_outlined
                                          : Icons.play_circle_outline,
                                      color: _foregeColor(time.hovering),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                if (widget.activeTabIndex == 1)
                  for (var record in scheduleMap.records) Container(),

                if (widget.activeTabIndex == 2)
                  for (CmdO cmd in scheduleMap.cmds) Container(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _foregeColor(bool hovering) {
    return hovering ? Colors.greenAccent : Colors.white70;
  }

  Color _backgroundColor(bool hovering) {
    return hovering ? Colors.black87 : Colors.black38;
  }

  // 加载 JSON 并存储到全局状态
  Future<void> _loadScheduleMap(BuildContext context) async {
    try {
      final jsonStr = await rootBundle.loadString(
        'assets/jsons/schedules.json',
      );
      final jsonData = jsonDecode(jsonStr) as Map<String, dynamic>;
      final scheduleMap = ScheduleMap.fromJson(jsonData);

      if (!context.mounted) return;
      context.read<MyAppState>().setScheduleMap(scheduleMap);
    } catch (e) {
      debugPrint('Failed to load schedules.json: $e');
    }
  }
}

class ScheduleBar extends StatelessWidget {
  const ScheduleBar({super.key, required this.activeTab});

  final int activeTab;

  @override
  Widget build(BuildContext context) {
    final int runningNum = context.watch<MyAppState>().runningScheduleNum;

    return Row(
      children: [
        Expanded(
          child: Container(
            margin: EdgeInsets.only(left: 20, top: 20, right: 20, bottom: 8),
            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            color: Colors.black38,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text.rich(
                  TextSpan(
                    style: TextStyle(color: Colors.white),
                    children: [
                      TextSpan(text: '共'),
                      TextSpan(
                        text: ' ${getNumOfNowTab(context)} ',
                        style: TextStyle(color: Colors.orangeAccent),
                      ),
                      TextSpan(text: '项任务，'),
                      TextSpan(
                        text: ' $runningNum ',
                        style: TextStyle(color: Colors.deepOrange),
                      ),
                      TextSpan(text: '项任务正在执行中'),
                    ],
                  ),
                ),
                FilledButton(
                  style: FilledButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(0),
                    ),
                    backgroundColor: Colors.black45,
                  ),
                  onPressed: () {},
                  child: Row(
                    children: [
                      Text(
                        '添加任务',
                        style: TextStyle(fontSize: 16, letterSpacing: 1),
                      ),
                      SizedBox(width: 6),
                      Icon(Icons.add),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  int getNumOfNowTab(BuildContext context) {
    var scheduleMap = context.read<MyAppState>().scheduleMap;
    if (scheduleMap != null) {
      if (activeTab == 0) {
        return scheduleMap.times.length;
      } else if (activeTab == 1) {
        return scheduleMap.records.length;
      } else {
        return scheduleMap.cmds.length;
      }
    } else {
      return 0;
    }
  }
}
