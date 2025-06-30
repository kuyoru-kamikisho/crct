import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => MyAppState(),
      child: MaterialApp.router(
        theme: ThemeData(
          fontFamily: 'HYWenHei85w',
          textTheme: TextTheme(labelSmall: TextStyle(fontSize: 16)),
        ),
        routerConfig: GoRouter(
          initialLocation: '/websites',
          routes: <RouteBase>[
            ShellRoute(
              builder:
                  (
                    BuildContext context,
                    GoRouterState state,
                    Widget routeWidget,
                  ) {
                    return LayoutBuilder(
                      builder: (context, constraints) {
                        context.read<MyAppState>().setScreenWidth(
                          constraints.maxWidth,
                        );
                        context.read<MyAppState>().setScreenHeight(
                          constraints.maxHeight,
                        );
                        return Scaffold(
                          body: Row(
                            children: [
                              KNavigator(constraints: constraints),
                              Expanded(child: routeWidget),
                            ],
                          ),
                        );
                      },
                    );
                  },
              routes: <RouteBase>[
                GoRoute(
                  path: '/',
                  builder: (BuildContext context, GoRouterState state) {
                    return HomeScreen();
                  },
                  routes: <RouteBase>[
                    GoRoute(
                      path: 'settings',
                      builder: (BuildContext context, GoRouterState state) {
                        return SettingsPage();
                      },
                    ),
                    GoRoute(
                      path: 'websites',
                      builder: (BuildContext context, GoRouterState state) {
                        return SiteScreen();
                      },
                    ),
                    GoRoute(
                      path: 'schedule',
                      builder: (BuildContext context, GoRouterState state) {
                        return ScheduleScreen();
                      },
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// 任务计划表页面
class ScheduleScreen extends StatelessWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Placeholder();
  }
}

class SiteScreen extends StatelessWidget {
  const SiteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black54,
      child: Column(children: [TextSearcher()]),
    );
  }
}

/// 搜索框组件
class TextSearcher extends StatefulWidget {
  const TextSearcher({super.key});

  @override
  State<TextSearcher> createState() => _TextSearcherState();
}

class SearchAction {
  final String name;
  final String target;
  final Widget icon;
  bool active;

  SearchAction({
    required this.name,
    required this.target,
    required this.icon,
    this.active = false,
  });
}

class _TextSearcherState extends State<TextSearcher> {
  final searchController = TextEditingController();
  final focusNode = FocusNode();
  var targetAction = '';
  List<SearchAction> searchActions = [
    SearchAction(
      name: '百度',
      target: 'https://www.baidu.com/s?wd=',
      icon: SvgPicture.asset('assets/icons/baidu_icon.svg'),
      active: true,
    ),
    SearchAction(
      name: '谷歌',
      target: 'https://www.google.com/search?q=',
      icon: SvgPicture.asset('assets/icons/google_icon.svg'),
      active: false,
    ),
    SearchAction(
      name: '必应',
      target: 'https://www.bing.com/search?q=',
      icon: SvgPicture.asset('assets/icons/biying_icon.svg'),
      active: false,
    ),
    SearchAction(
      name: '哔哩哔哩',
      target: 'https://search.bilibili.com/all?keyword=',
      icon: SvgPicture.asset('assets/icons/bilibili_icon.svg'),
      active: false,
    ),
    SearchAction(
      name: 'Youtube',
      target: 'https://www.youtube.com/results?search_query=',
      icon: SvgPicture.asset('assets/icons/youtube_icon.svg'),
      active: false,
    ),
    SearchAction(
      name: 'Yandex',
      target: 'https://yandex.com/search?text=',
      icon: SvgPicture.asset('assets/icons/yandex_icon.svg'),
      active: false,
    ),
  ];

  SearchAction getActive() {
    return searchActions.firstWhere((action) => action.active);
  }

  void switchAction() {
    final currentIndex = searchActions.indexWhere((action) => action.active);

    setState(() {
      if (currentIndex == -1) {
        searchActions.first.active = true;
        return;
      }

      searchActions[currentIndex].active = false;

      final nextIndex = (currentIndex + 1) % searchActions.length;
      searchActions[nextIndex].active = true;
    });
  }

  Future<void> doSearch() async {
    var text = searchController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('搜索内容不可以为空')));
      return;
    }

    var targetUrl = Uri.parse(getActive().target + text);
    if (!await launchUrl(targetUrl, mode: LaunchMode.externalApplication)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('无法打开此链接')));
    }
  }

  @override
  void dispose() {
    searchController.dispose();
    focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final searchInputWidth = context.watch<MyAppState>().appScreenWidth - 500;

    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: TextSelectionTheme(
        data: TextSelectionThemeData(
          selectionColor: Color.fromARGB(255, 63, 40, 147),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: EdgeInsets.all(0),
              decoration: BoxDecoration(
                border: Border.all(),
                color: Color.fromARGB(40, 0, 0, 0),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: searchInputWidth > 420 ? 420 : searchInputWidth,
                    child: TextField(
                      focusNode: focusNode,
                      style: TextStyle(
                        fontSize: 16,
                        color: WidgetStateColor.resolveWith((states) {
                          return states.contains(WidgetState.hovered)
                              ? Color(0xFF212121)
                              : Colors.black;
                        }),
                      ),
                      controller: searchController,
                      cursorColor: Colors.pink,
                      decoration: InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.fromLTRB(12, 12, 12, 12),
                        focusColor: Colors.red,
                        border: OutlineInputBorder(
                          borderSide: BorderSide(
                            style: BorderStyle.solid,
                            color: Colors.red,
                          ),
                          borderRadius: BorderRadius.all(Radius.circular(0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderSide: BorderSide(
                            style: BorderStyle.solid,
                            color: Colors.transparent,
                          ),
                          borderRadius: BorderRadius.all(Radius.circular(0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderSide: BorderSide(
                            style: BorderStyle.solid,
                            color: Colors.transparent,
                          ),
                          borderRadius: BorderRadius.all(Radius.circular(0)),
                        ),
                        hintText: '使用 ${getActive().name} 进行搜索',
                        hintStyle: TextStyle(color: Colors.white54),
                      ),
                      onSubmitted: (value) {
                        doSearch();
                        focusNode.requestFocus();
                      },
                    ),
                  ),
                  MouseRegion(
                    cursor: SystemMouseCursors.click,
                    child: InkWell(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 270),
                        switchOutCurve: Curves.easeInOut,
                        switchInCurve: Curves.easeInOut,
                        transitionBuilder:
                            (Widget child, Animation<double> animation) {
                              return FadeTransition(
                                opacity: animation,
                                child: child,
                              );
                            },
                        layoutBuilder: (currentChild, previousChildren) {
                          return SizedBox(
                            width: 20,
                            height: 20,
                            child: Stack(
                              alignment: Alignment.center,
                              children: <Widget>[
                                ...previousChildren,
                                if (currentChild != null) currentChild,
                              ],
                            ),
                          );
                        },
                        child: KeyedSubtree(
                          key: ValueKey(getActive().name),
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: getActive().icon,
                          ),
                        ),
                      ),
                      onTap: () {
                        switchAction();
                      },
                    ),
                  ),
                  SizedBox(width: 12),
                ],
              ),
            ),
            FilledButton(
              onPressed: () {
                doSearch();
              },
              style: ButtonStyle(
                padding: WidgetStateProperty.all(
                  const EdgeInsets.symmetric(vertical: 19, horizontal: 24),
                ),
                shape: WidgetStateProperty.all<RoundedRectangleBorder>(
                  RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                ),
                backgroundColor: WidgetStateProperty.all(Colors.black87),
              ),
              child: Text('搜索'),
            ),
          ],
        ),
      ),
    );
  }
}

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

/// 设置页面
class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Placeholder();
  }
}

/// 主页
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Placeholder();
  }
}

/// 全局存储
class MyAppState extends ChangeNotifier {
  double appScreenWidth = 320;
  double appScreenHeight = 720;

  void setScreenWidth(double n) {
    appScreenWidth = n;
    Future.microtask(() => notifyListeners());
  }

  void setScreenHeight(double n) {
    appScreenHeight = n;
    Future.microtask(() => notifyListeners());
  }
}
