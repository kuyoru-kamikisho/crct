import 'package:crct/store/use_app.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class DmcInfo extends StatelessWidget {
  const DmcInfo({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(context.watch<UseApp>().cpu),
        Text(context.watch<UseApp>().disk),
        Text(context.watch<UseApp>().memory),
      ],
    );
  }
}
