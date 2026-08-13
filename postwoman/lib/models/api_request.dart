import 'kv_pair.dart';

const httpMethods = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'TRACE',
  'CONNECT',
];

const allMethods = [...httpMethods, 'WS'];

enum BodyType { none, json, text, form, multipart }

class ApiRequest {
  String method;
  String url;
  List<KvPair> params;
  List<KvPair> headers;
  BodyType bodyType;
  String body;
  List<KvPair> formFields;
  bool insecureSsl;
  int timeoutSeconds;
  bool followRedirects;

  ApiRequest({
    this.method = 'GET',
    this.url = '',
    List<KvPair>? params,
    List<KvPair>? headers,
    this.bodyType = BodyType.none,
    this.body = '',
    List<KvPair>? formFields,
    this.insecureSsl = false,
    this.timeoutSeconds = 30,
    this.followRedirects = true,
  })  : params = params ?? [KvPair()],
        headers = headers ?? [KvPair()],
        formFields = formFields ?? [KvPair()];

  factory ApiRequest.empty() => ApiRequest();

  bool get isWebSocket {
    final m = method.toUpperCase();
    if (m == 'WS' || m == 'WSS') return true;
    final u = url.trim().toLowerCase();
    return u.startsWith('ws://') || u.startsWith('wss://');
  }

  List<KvPair> get enabledHeaders =>
      headers.where((h) => h.enabled && h.key.trim().isNotEmpty).toList();

  List<KvPair> get enabledParams =>
      params.where((p) => p.enabled && p.key.trim().isNotEmpty).toList();

  List<KvPair> get enabledFormFields =>
      formFields.where((p) => p.enabled && p.key.trim().isNotEmpty).toList();

  Uri resolveUri() {
    var raw = url.trim();
    if (raw.isEmpty) {
      throw const FormatException('URL 为空');
    }
    if (!raw.contains('://')) {
      raw = isWebSocket ? 'wss://$raw' : 'https://$raw';
    }
    var uri = Uri.parse(raw);
    if (isWebSocket) {
      uri = switch (uri.scheme) {
        'http' => uri.replace(scheme: 'ws'),
        'https' => uri.replace(scheme: 'wss'),
        'ws' || 'wss' => uri,
        _ => uri.replace(scheme: 'wss'),
      };
    }
    final extra = enabledParams;
    if (extra.isEmpty) return uri;
    final query = Map<String, String>.from(uri.queryParameters);
    for (final p in extra) {
      query[p.key.trim()] = p.value;
    }
    return uri.replace(queryParameters: query);
  }

  String? headerValue(String name) {
    final lower = name.toLowerCase();
    for (final h in enabledHeaders) {
      if (h.key.trim().toLowerCase() == lower) return h.value;
    }
    return null;
  }

  bool hasHeader(String name) => headerValue(name) != null;

  void ensureHeader(String name, String value) {
    if (hasHeader(name)) return;
    final blank = headers.indexWhere((h) => h.key.trim().isEmpty);
    if (blank >= 0) {
      headers[blank].key = name;
      headers[blank].value = value;
      headers[blank].enabled = true;
    } else {
      headers.add(KvPair(key: name, value: value));
    }
  }

  ApiRequest copy() => ApiRequest(
        method: method,
        url: url,
        params: params.map((e) => e.copy()).toList(),
        headers: headers.map((e) => e.copy()).toList(),
        bodyType: bodyType,
        body: body,
        formFields: formFields.map((e) => e.copy()).toList(),
        insecureSsl: insecureSsl,
        timeoutSeconds: timeoutSeconds,
        followRedirects: followRedirects,
      );

  Map<String, dynamic> toJson() => {
        'method': method,
        'url': url,
        'params': params.map((e) => e.toJson()).toList(),
        'headers': headers.map((e) => e.toJson()).toList(),
        'bodyType': bodyType.name,
        'body': body,
        'formFields': formFields.map((e) => e.toJson()).toList(),
        'insecureSsl': insecureSsl,
        'timeoutSeconds': timeoutSeconds,
        'followRedirects': followRedirects,
      };

  factory ApiRequest.fromJson(Map<String, dynamic> json) {
    BodyType bodyType = BodyType.none;
    final rawType = json['bodyType'] as String?;
    if (rawType != null) {
      bodyType = BodyType.values.firstWhere(
        (e) => e.name == rawType,
        orElse: () => BodyType.none,
      );
    }
    List<KvPair> parseList(String key) {
      final raw = json[key];
      if (raw is! List) return [KvPair()];
      final items = raw
          .whereType<Map>()
          .map((e) => KvPair.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      return items.isEmpty ? [KvPair()] : items;
    }

    return ApiRequest(
      method: (json['method'] as String?)?.toUpperCase() ?? 'GET',
      url: json['url'] as String? ?? '',
      params: parseList('params'),
      headers: parseList('headers'),
      bodyType: bodyType,
      body: json['body'] as String? ?? '',
      formFields: parseList('formFields'),
      insecureSsl: json['insecureSsl'] as bool? ?? false,
      timeoutSeconds: json['timeoutSeconds'] as int? ?? 30,
      followRedirects: json['followRedirects'] as bool? ?? true,
    );
  }
}
