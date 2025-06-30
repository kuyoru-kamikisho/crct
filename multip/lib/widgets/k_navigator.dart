import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// 左侧的菜单栏
class KNavigator extends StatefulWidget {
  final BoxConstraints constraints;

  const KNavigator({super.key, required this.constraints});

  @override
  State<KNavigator> createState() => _KNavigatorState();
}

class _KNavigatorState extends State<KNavigator> {
  final buttons = <Map<String, dynamic>>[
    {
      'label': '首页',
      'icon': Icon(Icons.house_outlined),
      'selectedIcon': Icon(Icons.house),
      'path': '/',
    },
    {
      'label': '任务计划',
      'icon': Icon(Icons.play_arrow),
      'selectedIcon': Icon(Icons.play_circle),
      'path': '/schedule',
    },
    {
      'label': '快捷导航',
      'icon': Icon(Icons.ads_click),
      'selectedIcon': Icon(Icons.touch_app),
      'path': '/websites',
    },
    {
      'label': '设置',
      'icon': Icon(Icons.settings_outlined),
      'selectedIcon': Icon(Icons.settings),
      'path': '/settings',
    },
  ];

  @override
  Widget build(BuildContext context) {
    var nowPath = GoRouter.of(context).state.fullPath;
    bool isSelected(String path) {
      return nowPath == path;
    }

    return SafeArea(
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            right: BorderSide(
              color: const Color.fromARGB(64, 36, 35, 36),
              width: 1.0,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black26,
              offset: Offset(1.0, 0.0),
              blurRadius: 4.0,
              spreadRadius: 0.0,
              blurStyle: BlurStyle.outer,
            ),
          ],
        ),
        width: 220,
        child: Column(
          spacing: 2,
          children: [
            for (Map<String, dynamic> leftNavItem in buttons)
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: () {
                        context.go(leftNavItem['path']);
                      },
                      style: FilledButton.styleFrom(
                        padding: EdgeInsets.only(left: 32),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(0),
                        ),
                        backgroundColor: isSelected(leftNavItem['path'])
                            ? Colors.black87
                            : Colors.black54,
                        foregroundColor: Colors.white,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(0, 12, 0, 12),
                        child: Row(
                          spacing: 8,
                          children: [
                            isSelected(leftNavItem['path'])
                                ? leftNavItem['selectedIcon']
                                : leftNavItem['icon'],
                            Text(
                              leftNavItem['label'],
                              style: TextStyle(
                                fontSize: Theme.of(
                                  context,
                                ).textTheme.labelSmall!.fontSize,
                              ),
                            ),
                          ],
                        ),
                      ),
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
