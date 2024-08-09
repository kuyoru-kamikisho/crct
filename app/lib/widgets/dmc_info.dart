import 'package:crct/store/use_app.dart';
import 'package:crct/widgets/style_text.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class DmcInfo extends StatelessWidget {
  DmcInfo({super.key});

  final TextStyle _style = dmcTextStyle();

  @override
  Widget build(BuildContext context) {
    double cpuN = context.watch<UseApp>().cpu;
    double memN = context.watch<UseApp>().memory;
    double dskN = context.watch<UseApp>().disk;
    int bttN = context.watch<UseApp>().battery;
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(0, 0, 4, 0),
                child: Icon(
                  Icons.eco,
                  size: 15,
                  color: statuColor(cpuN),
                ),
              ),
              Text(
                '${cpuN.toString()}%',
                style: _style,
              )
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(0, 0, 4, 0),
                child: Icon(
                  Icons.storage,
                  size: 15,
                  color: statuColor(dskN),
                ),
              ),
              Text(
                '${dskN.toString()}%',
                style: _style,
              )
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(0, 0, 4, 0),
                child: Icon(
                  Icons.memory,
                  size: 15,
                  color: statuColor(memN),
                ),
              ),
              Text(
                '${memN.toString()}%',
                style: _style,
              )
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            children: [
              Padding(
                  padding: const EdgeInsets.fromLTRB(0, 0, 4, 0),
                  child: Transform.rotate(
                    angle: 90 * 3.14159 / 180,
                    child: Icon(
                      statuBattery(bttN),
                      size: 15,
                      color: statuColor(101.0 - bttN),
                    ),
                  )),
              Text(
                '${bttN.toString()}%',
                style: _style,
              )
            ],
          ),
        ),
      ],
    );
  }
}
