import 'package:feriea/public_context.dart';
import 'package:flutter/foundation.dart';

class UseCurrency with ChangeNotifier, DiagnosticableTreeMixin {
  CurrencyObject _currencyFrom = CurrencyList.collections[2];
  CurrencyObject _currencyTo = CurrencyList.collections[8];
  CurrencyObject get currencyFrom => _currencyFrom;
  CurrencyObject get currencyTo => _currencyTo;
  void exchange() {
    var oldFrom = _currencyFrom;
    _currencyFrom = _currencyTo;
    _currencyTo = oldFrom;
    notifyListeners();
  }

  void setCurrencyFrom(CurrencyObject o) {
    _currencyFrom = o;
  }

  void setCurrencyTo(CurrencyObject o) {
    _currencyTo = o;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
        .add(DiagnosticsProperty<CurrencyObject>('currencyFrom', currencyFrom));
    properties
        .add(DiagnosticsProperty<CurrencyObject>('currencyTo', currencyTo));
  }
}
