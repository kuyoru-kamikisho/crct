import 'package:feriea/k_dropmenu.dart';
import 'package:feriea/public_context.dart';
import 'package:feriea/public_states.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

class CurrencySwitchBar extends StatelessWidget {
  const CurrencySwitchBar({super.key});

  @override
  Widget build(BuildContext context) {
    var ctx = context.read<UseCurrency>();
    return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Row(
          children: [
            Expanded(
                child: TextField(
              cursorColor: Colors.red,
              style: const TextStyle(fontSize: 14),
              maxLength: 18,
              enableSuggestions: false,
              keyboardType: TextInputType.visiblePassword,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r"[0-9][.0-9]?"))
              ],
              decoration: const InputDecoration(
                isDense: true,
                contentPadding: EdgeInsets.fromLTRB(6, 7, 6, 7),
                counterText: '',
                hintText: '100.00',
                border: OutlineInputBorder(
                    gapPadding: 0,
                    borderSide: BorderSide(width: 0, color: Colors.red),
                    borderRadius: BorderRadius.all(Radius.circular(0))),
                enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.zero),
                    gapPadding: 0,
                    borderSide: BorderSide(color: Colors.black, width: 0.4)),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.zero),
                    borderSide: BorderSide(color: Colors.black, width: 1)),
              ),
              onChanged: (s) {
                ctx.setInputMoney(s);
              },
            )),
            const CurrencyPair()
          ],
        ));
  }
}

class CurrencyPair extends StatelessWidget {
  const CurrencyPair({super.key});
  @override
  Widget build(BuildContext context) {
    double menuWidth = 102;
    double menuHeight = 320;
    var ctx = context.read<UseCurrency>();
    var initCurrencyFrom = context.watch<UseCurrency>().currencyFrom;
    var initCurrencyTo = context.watch<UseCurrency>().currencyTo;
    var menuList = CurrencyList.collections
        .map<KDropdownMenuEntry<String>>((CurrencyObject s) {
      return KDropdownMenuEntry<String>(
          value: s.name,
          label: s.name,
          style: const ButtonStyle(
              minimumSize: MaterialStatePropertyAll(Size.fromHeight(32))),
          leadingIcon: SvgPicture.asset(
            s.icon,
            width: 20,
          ));
    }).toList();
    var txtStyle = const TextStyle(fontSize: 14);
    var menuSyle = const MenuStyle(
      visualDensity: VisualDensity(),
      padding: MaterialStatePropertyAll(EdgeInsets.zero),
    );
    var inputDec = InputDecorationTheme(
        isDense: true,
        outlineBorder: const BorderSide(),
        constraints: BoxConstraints.tight(const Size.fromHeight(28)),
        helperStyle: const TextStyle(fontSize: 10),
        focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.zero,
            gapPadding: 0,
            borderSide: BorderSide(width: 1, color: Colors.black)),
        border: const OutlineInputBorder(
            borderRadius: BorderRadius.zero,
            gapPadding: 0,
            borderSide: BorderSide(width: 1, color: Colors.black)),
        contentPadding: const EdgeInsets.fromLTRB(12, 0, 8, 0));

    return Row(children: [
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: KDropdownMenu<String>(
            width: menuWidth,
            menuStyle: menuSyle,
            menuHeight: menuHeight,
            textStyle: txtStyle,
            inputDecorationTheme: inputDec,
            dropdownMenuEntries: menuList,
            initialSelection: initCurrencyFrom.name,
            onSelected: (String? s) {
              var useCurrency =
                  Provider.of<UseCurrency>(context, listen: false);
              if (s == useCurrency.currencyTo.name) {
                return ctx.exchange();
              }
              ctx.setCurrencyFrom(CurrencyList.getCurrency(s!));
            }),
      ),
      const Text(
        '兑换',
        style: TextStyle(fontSize: 12),
      ),
      Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: KDropdownMenu<String>(
              width: menuWidth,
              menuHeight: menuHeight,
              textStyle: txtStyle,
              menuStyle: menuSyle,
              inputDecorationTheme: inputDec,
              dropdownMenuEntries: menuList,
              initialSelection: initCurrencyTo.name,
              onSelected: (String? s) {
                var useCurrency =
                    Provider.of<UseCurrency>(context, listen: false);
                if (s == useCurrency.currencyFrom.name) {
                  return ctx.exchange();
                }
                ctx.setCurrencyTo(CurrencyList.getCurrency(s!));
              })),
      IconButton(
          color: Colors.grey[850],
          onPressed: () {
            ctx.exchange();
          },
          icon: const Icon(Icons.currency_exchange))
    ]);
  }
}
