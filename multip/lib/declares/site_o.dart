/// 链接按钮的结构声明
class SiteGroup {
  final String groupName;
  final List<SiteBtn> groupSites;
  bool active;

  SiteGroup({
    required this.groupName,
    required this.groupSites,
    this.active = false,
  });

  factory SiteGroup.fromJson(Map<String, dynamic> json) {
    return SiteGroup(
      groupName: json['groupName'] as String,
      groupSites: (json['groupSites'] as List)
          .map((item) => SiteBtn.fromJson(item))
          .toList(),
    );
  }
}

/// 链接按钮分组的结构声明
class SiteBtn {
  final String name;
  final String link;
  final String mark;
  bool active;

  SiteBtn({
    required this.name,
    required this.link,
    required this.mark,
    this.active = false,
  });

  factory SiteBtn.fromJson(Map<String, dynamic> json) {
    return SiteBtn(
      name: json['name'] as String,
      link: json['link'] as String,
      mark: json['mark'] as String,
    );
  }
}

