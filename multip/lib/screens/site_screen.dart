import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:multip/declares/site_o.dart';
import 'package:multip/states/my_app_state.dart';
import 'package:multip/widgets/site_button.dart';
import 'package:multip/widgets/text_searcher.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:provider/provider.dart';

/// 快捷网站页面
class SiteScreen extends StatefulWidget {
  const SiteScreen({super.key});

  @override
  State<SiteScreen> createState() => _SiteScreenState();
}

class _SiteScreenState extends State<SiteScreen> {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color.fromRGBO(0, 0, 0, 0.541),
      child: Column(
        children: [
          SizedBox(height: 28),
          TextSearcher(),
          SizedBox(height: 14),
          SitesBox(),
        ],
      ),
    );
  }
}

/// 网站容器盒
class SitesBox extends StatefulWidget {
  @override
  State<StatefulWidget> createState() => _SitesBox();
}

class _SitesBox extends State<SitesBox> {
  List<SiteGroup> _sites = [];

  Future<List<SiteGroup>> loadSiteJson() async {
    final jsonString = await rootBundle.loadString('assets/jsons/sites.json');
    final jsonData = jsonDecode(jsonString) as List<dynamic>;

    return jsonData.map<SiteGroup>((groupJson) {
      return SiteGroup.fromJson(groupJson as Map<String, dynamic>);
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    loadSiteJson().then((value) {
      setState(() {
        _sites = value;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final scrollController = ScrollController();

    // 组容器的宽度
    final siteGroupWidth = context.watch<MyAppState>().appScreenWidth - 300;

    // 占据剩余空间
    return Expanded(
      child: ScrollConfiguration(
        // 移除默认的滚动条
        behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
        child: RawScrollbar(
          thickness: 4,
          controller: scrollController,
          thumbColor: const Color.fromARGB(192, 180, 11, 39),
          radius: Radius.circular(0),
          child: ListView(
            controller: scrollController,
            shrinkWrap: true,
            children: [
              for (SiteGroup siteGroup in _sites)
                Container(
                  margin: EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    children: [
                      Container(
                        width: siteGroupWidth,
                        color: Colors.black38,
                        padding: EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              children: [
                                Text(
                                  siteGroup.groupName,
                                  style: TextStyle(color: Colors.white54),
                                ),
                              ],
                            ),
                            SizedBox(height: 8),
                            Wrap(
                              spacing: 18,
                              runSpacing: 12,
                              children: [
                                for (SiteBtn siteBtn in siteGroup.groupSites)
                                  SiteButton(siteBtn: siteBtn),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
