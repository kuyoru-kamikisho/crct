import 'dart:async';
import 'package:feriea/public_context.dart';
import 'package:feriea/public_fetch_rates.dart';
import 'package:flutter/foundation.dart';

class UseCurrency with ChangeNotifier, DiagnosticableTreeMixin {
  Timer? timer;
  String _inputMoney = '100.0';
  Map<String, dynamic>? _currencyRates;
  CurrencyObject _currencyFrom = CurrencyList.collections[2];
  CurrencyObject _currencyTo = CurrencyList.collections[8];
  String get inputMoney => _inputMoney;
  Map<String, dynamic>? get currencyRates => _currencyRates;
  CurrencyObject get currencyFrom => _currencyFrom;
  CurrencyObject get currencyTo => _currencyTo;

  void setInputMoney(String s) {
    if (s.isNotEmpty) {
      if (s.contains('.')) {
        s += '0';
      }
      _inputMoney = s;
    } else {
      _inputMoney = '100.0';
    }
    notifyListeners();
  }

  void setCurrencyRates(Map<String, dynamic> json) {
    _currencyRates = json;
    notifyListeners();
  }

  void exchange() {
    var oldFrom = _currencyFrom;
    _currencyFrom = _currencyTo;
    _currencyTo = oldFrom;
    notifyListeners();
  }

  void setCurrencyFrom(CurrencyObject o) {
    _currencyFrom = o;
    notifyListeners();
  }

  void setCurrencyTo(CurrencyObject o) {
    _currencyTo = o;
    notifyListeners();
  }

  /// 该函数会在程序运行时自动开始执行
  void queryRates() {
    timer = Timer.periodic(const Duration(seconds: 5), (Timer t) {
      getRates().then((v) {
        if (v != null) {
          setCurrencyRates(v);
        }
      });
    });
  }

  void stopRatesQuery() {
    if (timer != null) {
      timer?.cancel();
    }
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
