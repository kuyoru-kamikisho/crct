import 'dart:convert';
import 'package:http/http.dart' as http;

/// IP 信息对象类型
class IpInfoO {
  // ip地址
  late String ip;
  // 城市
  late String city;
  // 时区
  late String timezone;
  // 纬度
  late String latitude;
  // 经度
  late String longitude;
  // 国家识别名
  late String countrycode;
}

/// 查询自己的 IP 信息
Future<IpInfoO?> queryMyIp() async {
  var v = IpInfoO();
  final Uri api = Uri.parse('https://api.ip.sb/geoip');
  Map<String, String> headers = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
  };
  var res = await http.get(api, headers: headers);
  if (res.statusCode == 200) {
    var o = json.decode(res.body);
    v.ip = o['ip'];
    v.city = o['city'];
    v.timezone = o['timezone'];
    v.latitude = o['latitude'];
    v.longitude = o['longitude'];
    v.countrycode = o['country_code'];
    return v;
  } else {
    return null;
  }
}

/// [value] 被补零的数值
///
/// [len] 期望的数值字符串长度
String padZero(int value, {int len = 2}) {
  return value.toString().padLeft(len, '0');
}

/// 获取日语星期几
String getJpWeekDay(int day) {
  Map<int, String> jpWeekdays = {
    7: '日曜日',
    1: '月曜日',
    2: '火曜日',
    3: '水曜日',
    4: '木曜日',
    5: '金曜日',
    6: '土曜日',
  };
  return jpWeekdays[day] ?? '';
}

/// 获取英文星期几（简写）
String getEnWeekDay(int day) {
  Map<int, String> enWeekdays = {
    7: 'Sun',
    1: 'Mon',
    2: 'Tues',
    3: 'Weds',
    4: 'Thur',
    5: 'Fri',
    6: 'Sat',
  };
  return enWeekdays[day] ?? '';
}
