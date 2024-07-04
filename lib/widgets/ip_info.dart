import 'package:crct/tools/myip.dart';
import 'package:crct/widgets/style_text.dart';
import 'package:flutter/material.dart';

class IpInfo extends StatefulWidget {
  const IpInfo({super.key});

  @override
  State<StatefulWidget> createState() => _IpInfo();
}

class _IpInfo extends State<IpInfo> {
  String _whereip = '..';

  void _fetch() {
    setState(() {
      _whereip = '..';
    });
    queryIpInfo().then((ip) {
      setState(() {
        _whereip = ip.city;
      });
    });
  }

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
        onTap: () {
          _fetch();
        },
        child: Text(
          _whereip,
          style: dmcTextStyle(),
        ));
  }
}
