import 'package:flutter/material.dart';
import 'package:multip/widgets/text_searcher.dart';

/// 快捷网站页面
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
