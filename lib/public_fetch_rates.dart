import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

/// 获取各个币种的汇率
///
/// https://www.xe.com/api/protected/midmarket-converter/
Future<Map<String, dynamic>?> getRates() async {
  final url =
      Uri.parse('https://www.xe.com/api/protected/midmarket-converter/');
  final httpClient = http.Client();
  try {
    final response = await httpClient.get(url, headers: {
      'accept': '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'en-US,en;q=0.9',
      'authorization': 'Basic bG9kZXN0YXI6cHVnc25heA==',
      'cookie':
          'dashboardInverseMode=false; lastConversion={%22amount%22:1%2C%22fromCurrency%22:%22CNY%22%2C%22toCurrency%22:%22EUR%22}',
      'if-none-match': '"salnc2u9573c9"',
      'referer': 'https://www.xe.com/zh-CN/',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36',
    });
    if (response.statusCode == HttpStatus.ok) {
      final responseBody = jsonDecode(response.body);
      return responseBody;
    } else {
      debugPrint('Request failed with status: ${response.statusCode}.');
    }
  } catch (e) {
    debugPrint(e.toString());
  } finally {
    httpClient.close();
  }
  return null;
}
