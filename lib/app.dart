import 'package:crct/widgets/dmc_info.dart';
import 'package:crct/widgets/ip_info.dart';
import 'package:crct/widgets/time_info.dart';
import 'package:flutter/material.dart';

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(),
          Container(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: IntrinsicHeight(
                  child: Row(
                mainAxisAlignment: MainAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.fromLTRB(8, 0, 8, 0),
                    child: const TimeInfo(),
                  ),
                  const VerticalDivider(
                    width: 1,
                    thickness: 1,
                    color: Colors.white60,
                    indent: 2,
                    endIndent: 2,
                  ),
                  Container(
                    padding: const EdgeInsets.fromLTRB(8, 0, 8, 0),
                    child: DmcInfo(),
                  ),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(8, 0, 8, 0),
                    child: IpInfo(),
                  )
                ],
              )))
        ],
      ),
    );
  }
}
