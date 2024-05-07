import 'package:feriea/public_context.dart';
import 'package:feriea/public_states.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

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
    var ipdv = context.watch<UseCurrency>().inputMoney;
    var rats = context.watch<UseCurrency>().currencyRates;
    var frmn = context.watch<UseCurrency>().currencyFrom.name;
    var tomn = context.watch<UseCurrency>().currencyTo.name;

    double rest(String to) {
      return CurrencyList.usdBaseCrossRate(
          double.parse('${rats?['rates'][frmn]}'),
          double.parse('${rats?['rates'][to]}'),
          double.parse(ipdv));
    }

    return Card(
      color: currencyType == frmn
          ? Colors.amber[700]
          : currencyType == tomn
              ? Colors.redAccent[400]
              : Colors.blue[50],
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.zero)),
      child: Row(
        children: [
          Expanded(child: KSmallSticker(text: currencyType!)),
          Expanded(
              child: KSmallSticker(text: '${rats?['rates'][currencyType!]}')),
          Expanded(child: KSmallSticker(text: '${rest(currencyType!)}')),
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
