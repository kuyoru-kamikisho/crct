import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:multip/states/my_app_state.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';


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

/// 搜索框组件
class TextSearcher extends StatefulWidget {
  const TextSearcher({super.key});

  @override
  State<TextSearcher> createState() => _TextSearcherState();
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

