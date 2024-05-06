import 'package:feriea/public_context.dart';
import 'package:flutter/material.dart';

class CurrencyViewBox extends StatelessWidget {
  const CurrencyViewBox({super.key, required this.constraints});
  final BoxConstraints constraints;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: List.generate(
          CurrencyList.collections.length,
          (index) => CurrencyInfoBar(
              currencyType: CurrencyList.collections[index].name)),
    );
  }
}

class CurrencyInfoBar extends StatelessWidget {
  const CurrencyInfoBar({super.key, this.currencyType = ''});
  final String? currencyType;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.zero)),
      child: Row(
        children: [
          Expanded(child: KSmallSticker(text: currencyType!)),
          const Expanded(child: KSmallSticker(text: '21.84')),
          const Expanded(child: KSmallSticker(text: '-0.046%')),
          const Expanded(child: KSmallSticker(text: '2,184.1242')),
        ],
      ),
    );
  }
}

class KSmallSticker extends StatelessWidget {
  static const List<double> _defaultPadding = [8, 6, 8, 6];
  static const List<double> _defaultMarging = [0, 0, 0, 0];
  const KSmallSticker({
    super.key,
    this.text = '',
    this.width,
    this.height,
    this.padding = _defaultPadding,
    this.marging = _defaultMarging,
  });
  final double? width;
  final double? height;
  final String text;
  final List<double> padding;
  final List<double> marging;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      margin:
          EdgeInsets.fromLTRB(marging[0], marging[1], marging[2], marging[3]),
      padding:
          EdgeInsets.fromLTRB(padding[0], padding[1], padding[2], padding[3]),
      child: Text(text),
    );
  }
}
