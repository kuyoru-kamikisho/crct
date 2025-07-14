import 'package:flutter/material.dart';
import 'package:multip/tools/css_color.dart';
import 'package:url_launcher/url_launcher.dart';

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

// 按钮UI组件
class SiteButton extends StatefulWidget {
  const SiteButton({super.key, required this.siteBtn});

  final SiteBtn siteBtn;

  @override
  State<SiteButton> createState() => _SiteButtonState();
}

class _SiteButtonState extends State<SiteButton> {
  bool _isHovered = false;
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() {
        _isHovered = false;
        _isPressed = false;
      }),
      child: GestureDetector(
        onTap: () {
          launchUrl(
            Uri.parse(widget.siteBtn.link),
            mode: LaunchMode.externalApplication,
          );
        },
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) => setState(() => _isPressed = false),
        onTapCancel: () => setState(() => _isPressed = false),
        child: Container(
          padding: EdgeInsets.fromLTRB(14, 3, 14, 3),
          color: _isHovered ? Colors.black : Colors.black54,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 6,
                height: 6,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: parseCssColor(widget.siteBtn.mark),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              SizedBox(width: 8),
              Text(
                widget.siteBtn.name,
                style: TextStyle(
                  fontFamily: 'HYWenHei75w',
                  fontSize: 16,
                  letterSpacing: 1,
                  color: _isPressed
                      ? Colors.limeAccent
                      : _isHovered
                      ? parseCssColor(widget.siteBtn.mark)
                      : Colors.white70,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
