/// 币种类
class CurrencyObject {
  CurrencyObject(this.name, this.icon, this.cnName);
  final String name;
  final String icon;
  final String cnName;
}

/// 币种集合类，包含了图标及注释
///
/// 图片来源：https://www.xe.com/svgs/flags/cny.static.svg
class CurrencyList {
  static List<CurrencyObject> collections = <CurrencyObject>[
    CurrencyObject('AUD', 'assets/flags/aud.static.svg', '澳大利亚元'),
    CurrencyObject('CAD', 'assets/flags/cad.static.svg', '加拿大元'),
    CurrencyObject('CNY', 'assets/flags/cny.static.svg', '中国人民币'),
    CurrencyObject('CHF', 'assets/flags/chf.static.svg', '瑞士法郎'),
    CurrencyObject('EUR', 'assets/flags/eur.static.svg', '欧元'),
    CurrencyObject('GBP', 'assets/flags/gbp.static.svg', '英镑'),
    CurrencyObject('HKD', 'assets/flags/hkd.static.svg', '港币'),
    CurrencyObject('INR', 'assets/flags/inr.static.svg', '印度卢比'),
    CurrencyObject('JPY', 'assets/flags/jpy.static.svg', '日元'),
    CurrencyObject('MOP', 'assets/flags/mop.static.svg', '澳门元'),
    CurrencyObject('RUB', 'assets/flags/rub.static.svg', '俄罗斯卢布'),
    CurrencyObject('TWD', 'assets/flags/twd.static.svg', '新台币'),
    CurrencyObject('USD', 'assets/flags/usd.static.svg', '美元'),
    CurrencyObject('ZAR', 'assets/flags/zar.static.svg', '南非兰特'),
  ];
  static CurrencyObject getCurrency(String name) {
    return collections.firstWhere((element) => element.name == name,
        orElse: () => collections[2]);
  }
}
