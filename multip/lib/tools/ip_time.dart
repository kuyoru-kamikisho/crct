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
  late double latitude;
  // 经度
  late double longitude;
  // 国家识别名
  late String countrycode;
}

/// 天气信息对象类型
class WeatherO {
  // 海拔
  late double elevation;
  // 单位说明
  late CurrentWeatherUnit currentUnits;
  // 当前详细信息
  late CurrentWeather current;

  // 天气代码标识
  Map<int, String> wmoCode = {
    // 晴/云
    0: '晴空',
    1: '晴（少云）',
    2: '多云',
    3: '阴天',

    // 雾/霜
    45: '雾',
    48: '结霜雾',

    // 毛毛雨
    51: '零星毛毛雨',
    53: '毛毛雨',
    55: '密集毛毛雨',
    56: '轻冻毛毛雨',
    57: '强冻毛毛雨',

    // 雨
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '轻冻雨',
    67: '强冻雨',

    // 雪
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',

    // 阵雨
    80: '小雨阵',
    81: '中雨阵',
    82: '暴雨阵',
    85: '小雪阵',
    86: '大雪阵',

    // 雷暴
    95: '雷暴',
    96: '雷暴伴小冰雹',
    99: '雷暴伴大冰雹',
  };

  String get weatherCn {
    return wmoCode[current.weatherCode] ?? '';
  }
}

class CurrentWeatherUnit {
  // 时间计量标准 默认iso8601
  late String time;
  // 温度单位
  late String temperature2m;
  // 相对湿度单位
  late String relativeHumidity2m;
  // 体感温度单位
  late String apparentTemperature;
  // 默认为空
  late String isDay;
  // 降雨量单位
  late String rain;
  // 降雪量单位
  late String snowfall;
  // 天气代码 忽略
  late String weatherCode;
  // 风向单位
  late String windDirection10m;
  // 风速单位
  late String windSpeed10m;
}

class CurrentWeather {
  // 天气时间
  late String? time;
  // 温度
  late double? temperature2m;
  // 相对湿度2m
  late int? relativeHumidity2m;
  // 体感温度
  late double? apparentTemperature;
  // 白天
  late int? isDay;
  // 降雨量
  late double? rain;
  // 降雪量
  late double? snowfall;
  // 天气代码
  late int? weatherCode;
  // 风向
  late int? windDirection10m;
  // 风速
  late double? windSpeed10m;
}

final Map<String, String> commonHeader = {
  'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
};

/// 查询自己的 IP 信息
Future<IpInfoO?> queryMyIp() async {
  var v = IpInfoO();
  final Uri api = Uri.parse('https://api.ip.sb/geoip');

  var res = await http.get(api, headers: commonHeader);
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

/// 查询天气情况
Future<WeatherO?> queryWeather({
  double latitude = 39.911,
  double longitude = 116.395,
}) async {
  var wo = WeatherO();
  var cw = CurrentWeather();
  var cu = CurrentWeatherUnit();

  final Uri api = Uri.parse(
    'https://api.open-meteo.com/v1/forecast?latitude=$latitude&longitude=$longitude&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,rain,snowfall,weather_code,wind_direction_10m,wind_speed_10m&timezone=auto',
  );

  var res = await http.get(api, headers: commonHeader);
  if (res.statusCode == 200) {
    var o = json.decode(res.body);
    wo.elevation = o['elevation'];

    var ow = o['current'];
    cw.time = ow['time'];
    cw.temperature2m = ow['temperature_2m'];
    cw.relativeHumidity2m = ow['relative_humidity_2m'];
    cw.apparentTemperature = ow['apparent_temperature'];
    cw.isDay = ow['is_day'];
    cw.rain = ow['rain'];
    cw.snowfall = ow['snowfall'];
    cw.weatherCode = ow['weather_code'];
    cw.windDirection10m = ow['wind_direction_10m'];
    cw.windSpeed10m = ow['wind_speed_10m'];

    var ou = o['current_units'];
    cu.time = ou['time'];
    cu.temperature2m = ou['temperature_2m'];
    cu.relativeHumidity2m = ou['relative_humidity_2m'];
    cu.apparentTemperature = ou['apparent_temperature'];
    cu.isDay = ou['is_day'];
    cu.rain = ou['rain'];
    cu.snowfall = ou['snowfall'];
    cu.weatherCode = ou['weather_code'];
    cu.windDirection10m = ou['wind_direction_10m'];
    cu.windSpeed10m = ou['wind_speed_10m'];

    wo.currentUnits = cu;
    wo.current = cw;
    return wo;
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
