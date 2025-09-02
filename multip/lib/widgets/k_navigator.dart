import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:multip/states/my_app_state.dart';
import 'package:provider/provider.dart';

/// 左侧的菜单栏
class KNavigator extends StatefulWidget {
  final BoxConstraints constraints;

  const KNavigator({super.key, required this.constraints});

  @override
  State<KNavigator> createState() => _KNavigatorState();
}

class _KNavigatorState extends State<KNavigator> {
  final List<Map<String, dynamic>> buttons = <Map<String, dynamic>>[
    {
      'label': '首页',
      'icon': const Icon(Icons.house_outlined),
      'selectedIcon': const Icon(Icons.house),
      'path': '/',
    },
    {
      'label': '任务计划',
      'icon': const Icon(Icons.play_arrow),
      'selectedIcon': const Icon(Icons.play_circle),
      'path': '/schedule',
    },
    {
      'label': '快捷导航',
      'icon': const Icon(Icons.ads_click),
      'selectedIcon': const Icon(Icons.touch_app),
      'path': '/websites',
    },
    {
      'label': '单词助记',
      'icon': const Icon(Icons.abc),
      'selectedIcon': const Icon(Icons.spellcheck),
      'path': '/wordFlashcards',
    },
    {
      'label': '维森社',
      'icon': const Icon(Icons.diversity_2),
      'selectedIcon': const Icon(Icons.catching_pokemon),
      'path': '/guild',
    },
    {
      'label': '设置',
      'icon': const Icon(Icons.settings_outlined),
      'selectedIcon': const Icon(Icons.settings),
      'path': '/settings',
    },
  ];

  @override
  Widget build(BuildContext context) {
    // Ensure nowPath is not null for comparison
    final String nowPath = GoRouter.of(context).state.fullPath ?? '/';
    final bool isSmallScreen = context.watch<MyAppState>().appScreenWidth < 762;

    bool isSelected(String path) {
      return nowPath == path;
    }

    return SafeArea(
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.ease,
        decoration: const BoxDecoration(
          border: Border(
            right: BorderSide(
              color: Color.fromARGB(64, 36, 35, 36),
              width: 1.0,
            ),
          ),
        ),
        width: isSmallScreen ? 40 : 160,
        child: ClipRect(
          child: Column(
            spacing: 1,
            children: <Widget>[
              for (Map<String, dynamic> leftNavItem in buttons)
                Row(
                  children: <Widget>[
                    Expanded(
                      child: FilledButton(
                        onPressed: () {
                          context.go(leftNavItem['path'] as String);
                        },
                        style: FilledButton.styleFrom(
                          padding: EdgeInsets.only(
                            left: isSmallScreen ? 10 : 26,
                            right: isSmallScreen ? 0 : 16,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(0),
                          ),
                          backgroundColor:
                              isSelected(leftNavItem['path'] as String)
                              ? Colors.black87
                              : Colors.black54,
                          foregroundColor: Colors.white,
                        ),
                        child: SizedBox(
                          height: 40,
                          child: Row(
                            // 'spacing' property is not available for Row.
                            // Use SizedBox(width: X) for horizontal spacing.
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: <Widget>[
                              // Ensure Icons are properly typed
                              isSelected(leftNavItem['path'] as String)
                                  ? leftNavItem['selectedIcon'] as Widget
                                  : leftNavItem['icon'] as Widget,
                              if (!isSmallScreen) ...<Widget>[
                                const SizedBox(
                                  width: 8,
                                ), // Fixed: Replaced 'spacing: 8'
                                // Wrap Text in Expanded to prevent overflow if the label is too long
                                Expanded(
                                  child: Text(
                                    // Ensure 'label' is treated as a String
                                    leftNavItem['label'] as String,
                                    style: TextStyle(
                                      fontSize: Theme.of(
                                        context,
                                      ).textTheme.labelSmall!.fontSize,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                    maxLines: 1,
                                  ),
                                ),
                              ],
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
      ),
    );
  }
}
