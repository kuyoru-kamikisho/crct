import 'dart:convert';

import 'package:http/http.dart' as http;

const String apiBaseUrl = 'http://localhost:8080/api/users';

class ApiClient {
  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$apiBaseUrl$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> get(String path) async {
    final response = await http.get(Uri.parse('$apiBaseUrl$path'));
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}
