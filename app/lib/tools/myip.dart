import 'dart:convert';
import 'package:http/http.dart' as http;

class IpInfoO {
  late String ip;
  late String city;
  late String timezone;
  late String countrycode;
}

Future<IpInfoO> queryIpInfo() async {
  var v = IpInfoO();
  final Uri api = Uri.parse('https://api.ip.sb/geoip');
  Map<String, String> headers = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
  };
  var res = await http.get(api, headers: headers);
  if (res.statusCode == 200) {
    var o = json.decode(res.body);
    v.ip = o['ip'];
    v.city = o['city'];
    v.timezone = o['timezone'];
    v.countrycode = o['country_code'];
    return v;
  } else {
    throw Exception('get ip failed: ${res.statusCode}');
  }
}
