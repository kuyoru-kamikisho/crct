import 'dart:convert';
import 'dart:io';

import '../models/api_request.dart';
import '../models/kv_pair.dart';

class CurlParseException implements Exception {
  final String message;
  CurlParseException(this.message);
  @override
  String toString() => message;
}

/// 把 bash curl 字符串解析成请求。覆盖日常拷贝下来的常见写法。
ApiRequest parseCurl(String raw) {
  final tokens = tokenizeCurl(raw);
  if (tokens.isEmpty) {
    throw CurlParseException('curl 内容为空');
  }

  var i = 0;
  if (_isCurlBin(tokens[0])) i = 1;
  if (i >= tokens.length) {
    throw CurlParseException('缺少 URL');
  }

  String? method;
  String? url;
  final headers = <KvPair>[];
  final dataParts = <String>[];
  var dataIsUrlEncode = false;
  var dataAsQuery = false;
  var headOnly = false;
  var insecure = false;
  final formFields = <KvPair>[];
  var timeout = 30;
  String? user;
  String? userAgent;
  String? referer;
  String? cookie;

  while (i < tokens.length) {
    final t = tokens[i];
    if (!t.startsWith('-') || t == '-') {
      url ??= t;
      i++;
      continue;
    }

    final parsed = _splitFlag(t);
    final flag = parsed.$1;
    String? attached = parsed.$2;

    String takeArg() {
      if (attached != null) {
        final v = attached!;
        attached = null;
        return v;
      }
      i++;
      if (i >= tokens.length) {
        throw CurlParseException('选项 $flag 缺少参数');
      }
      return tokens[i];
    }

    switch (flag) {
      case '-X':
      case '--request':
        method = takeArg().toUpperCase();
        break;
      case '--url':
        url = takeArg();
        break;
      case '-H':
      case '--header':
        headers.add(_parseHeader(takeArg()));
        break;
      case '-d':
      case '--data':
      case '--data-raw':
      case '--data-binary':
      case '--data-ascii':
        dataParts.add(_maybeReadFile(takeArg()));
        break;
      case '--data-urlencode':
        dataIsUrlEncode = true;
        dataParts.add(takeArg());
        break;
      case '-F':
      case '--form':
      case '--form-string':
        formFields.add(_parseFormField(takeArg()));
        break;
      case '-u':
      case '--user':
        user = takeArg();
        break;
      case '-A':
      case '--user-agent':
        userAgent = takeArg();
        break;
      case '-e':
      case '--referer':
        referer = takeArg();
        break;
      case '-b':
      case '--cookie':
        cookie = takeArg();
        break;
      case '-m':
      case '--max-time':
        timeout = int.tryParse(takeArg()) ?? timeout;
        break;
      case '-G':
      case '--get':
        dataAsQuery = true;
        break;
      case '-I':
      case '--head':
        headOnly = true;
        break;
      case '-k':
      case '--insecure':
        insecure = true;
        break;
      case '-L':
      case '--location':
      case '--location-trusted':
        break;
      case '--connect-timeout':
      case '--max-redirs':
      case '-o':
      case '--output':
      case '-w':
      case '--write-out':
      case '-x':
      case '--proxy':
      case '--resolve':
      case '--retry':
      case '-T':
      case '--upload-file':
      case '--cacert':
      case '--capath':
      case '-E':
      case '--cert':
      case '--key':
      case '-c':
      case '--cookie-jar':
      case '--unix-socket':
      case '--interface':
        takeArg();
        break;
      default:
        if (_flagTakesArg(flag) && attached == null) {
          if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
            i++;
          }
        }
        break;
    }
    i++;
  }

  url ??= '';
  if (url.isEmpty) {
    throw CurlParseException('未找到 URL');
  }

  if (userAgent != null) headers.add(KvPair(key: 'User-Agent', value: userAgent));
  if (referer != null) headers.add(KvPair(key: 'Referer', value: referer));
  if (cookie != null) headers.add(KvPair(key: 'Cookie', value: cookie));
  if (user != null) {
    final token = base64.encode(utf8.encode(user));
    headers.add(KvPair(key: 'Authorization', value: 'Basic $token'));
  }

  var bodyType = BodyType.none;
  var body = '';
  final params = <KvPair>[KvPair()];

  if (formFields.isNotEmpty) {
    bodyType = BodyType.multipart;
    method ??= 'POST';
  } else if (dataParts.isNotEmpty) {
    final joined = dataParts.join('&');
    if (dataAsQuery) {
      method ??= 'GET';
      params.clear();
      params.addAll(_parseQueryPairs(joined));
      if (params.isEmpty) params.add(KvPair());
    } else {
      method ??= headOnly ? 'HEAD' : 'POST';
      body = joined;
      if (dataIsUrlEncode || _looksLikeForm(joined)) {
        bodyType = BodyType.form;
        formFields.addAll(_parseQueryPairs(joined));
      } else if (_looksLikeJson(joined)) {
        bodyType = BodyType.json;
      } else {
        bodyType = BodyType.text;
      }
    }
  } else if (headOnly) {
    method ??= 'HEAD';
  }

  method ??= 'GET';
  if (url.toLowerCase().startsWith('ws://') || url.toLowerCase().startsWith('wss://')) {
    method = 'WS';
  }

  if (headers.isEmpty) headers.add(KvPair());
  if (formFields.isEmpty) formFields.add(KvPair());

  return ApiRequest(
    method: method,
    url: url,
    params: params,
    headers: headers,
    bodyType: bodyType,
    body: body,
    formFields: formFields,
    insecureSsl: insecure,
    timeoutSeconds: timeout,
    followRedirects: true,
  );
}

String encodeCurl(ApiRequest req) {
  final parts = <String>['curl'];
  final method = req.method.toUpperCase();
  if (req.isWebSocket) {
    parts.add('--url');
    parts.add(_bashQuote(req.resolveUri().toString()));
    return parts.join(' ');
  }
  if (method != 'GET') {
    parts.add('-X');
    parts.add(method);
  }
  if (req.insecureSsl) parts.add('-k');
  if (req.followRedirects) parts.add('-L');
  for (final h in req.enabledHeaders) {
    parts.add('-H');
    parts.add(_bashQuote('${h.key.trim()}: ${h.value}'));
  }
  switch (req.bodyType) {
    case BodyType.none:
      break;
    case BodyType.json:
    case BodyType.text:
      if (req.body.isNotEmpty) {
        parts.add('--data-raw');
        parts.add(_bashQuote(req.body));
      }
      break;
    case BodyType.form:
      final encoded = req.enabledFormFields
          .map((e) =>
              '${Uri.encodeQueryComponent(e.key.trim())}=${Uri.encodeQueryComponent(e.value)}')
          .join('&');
      if (encoded.isNotEmpty) {
        parts.add('--data-raw');
        parts.add(_bashQuote(encoded));
      }
      break;
    case BodyType.multipart:
      for (final f in req.enabledFormFields) {
        parts.add('-F');
        parts.add(_bashQuote('${f.key.trim()}=${f.value}'));
      }
      break;
  }
  parts.add(_bashQuote(req.resolveUri().toString()));
  return parts.join(' \\\n  ');
}

List<String> tokenizeCurl(String raw) {
  final normalized = raw.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  final buf = StringBuffer();
  final chars = <int>[];
  final units = normalized.codeUnits;
  for (var i = 0; i < units.length; i++) {
    if (units[i] == 0x5C /* \ */ && i + 1 < units.length && units[i + 1] == 0x0A) {
      i++;
      continue;
    }
    chars.add(units[i]);
  }
  final s = String.fromCharCodes(chars);
  final tokens = <String>[];
  var i = 0;
  var inSingle = false;
  var inDouble = false;

  void flush() {
    if (buf.isNotEmpty) {
      tokens.add(buf.toString());
      buf.clear();
    }
  }

  while (i < s.length) {
    final c = s[i];
    if (!inSingle && !inDouble) {
      if (c == ' ' || c == '\t' || c == '\n') {
        flush();
        i++;
        continue;
      }
      if (c == '#') {
        while (i < s.length && s[i] != '\n') {
          i++;
        }
        continue;
      }
      if (c == "'") {
        inSingle = true;
        i++;
        continue;
      }
      if (c == '"') {
        inDouble = true;
        i++;
        continue;
      }
      if (c == r'\' && i + 1 < s.length) {
        buf.write(s[i + 1]);
        i += 2;
        continue;
      }
      buf.write(c);
      i++;
      continue;
    }
    if (inSingle) {
      if (c == "'") {
        inSingle = false;
        i++;
        continue;
      }
      buf.write(c);
      i++;
      continue;
    }
    if (c == r'\' && i + 1 < s.length) {
      final n = s[i + 1];
      if (n == '"' || n == r'\' || n == r'$' || n == '`') {
        buf.write(n);
        i += 2;
        continue;
      }
      if (n == '\n') {
        i += 2;
        continue;
      }
    }
    if (c == '"') {
      inDouble = false;
      i++;
      continue;
    }
    buf.write(c);
    i++;
  }
  flush();
  return tokens;
}

bool _isCurlBin(String token) {
  final t = token.toLowerCase().replaceAll('\\', '/');
  return t == 'curl' || t == 'curl.exe' || t.endsWith('/curl') || t.endsWith('/curl.exe');
}

(String, String?) _splitFlag(String token) {
  if (token.startsWith('--')) {
    final eq = token.indexOf('=');
    if (eq > 2) {
      return (token.substring(0, eq), token.substring(eq + 1));
    }
    return (token, null);
  }
  if (token.startsWith('-') && token.length > 2) {
    final name = token.substring(0, 2);
    if (_shortWithArg.contains(name)) {
      return (name, token.substring(2));
    }
  }
  return (token, null);
}

const _shortWithArg = {
  '-X',
  '-H',
  '-d',
  '-u',
  '-A',
  '-e',
  '-b',
  '-F',
  '-m',
  '-o',
  '-w',
  '-x',
  '-T',
  '-c',
  '-E',
};

bool _flagTakesArg(String flag) {
  return _shortWithArg.contains(flag) ||
      flag.startsWith('--') &&
          {
            '--request',
            '--header',
            '--data',
            '--data-raw',
            '--data-binary',
            '--data-ascii',
            '--data-urlencode',
            '--url',
            '--user',
            '--user-agent',
            '--referer',
            '--cookie',
            '--form',
            '--form-string',
            '--max-time',
            '--output',
            '--write-out',
            '--proxy',
            '--resolve',
            '--retry',
            '--upload-file',
            '--cacert',
            '--capath',
            '--cert',
            '--key',
            '--cookie-jar',
            '--connect-timeout',
            '--max-redirs',
            '--unix-socket',
            '--interface',
          }.contains(flag);
}

KvPair _parseHeader(String raw) {
  final idx = raw.indexOf(':');
  if (idx < 0) return KvPair(key: raw.trim(), value: '');
  return KvPair(
    key: raw.substring(0, idx).trim(),
    value: raw.substring(idx + 1).trim(),
  );
}

KvPair _parseFormField(String raw) {
  final idx = raw.indexOf('=');
  if (idx < 0) return KvPair(key: raw, value: '');
  return KvPair(key: raw.substring(0, idx), value: raw.substring(idx + 1));
}

List<KvPair> _parseQueryPairs(String raw) {
  if (raw.isEmpty) return [];
  return raw.split('&').where((e) => e.isNotEmpty).map((part) {
    final idx = part.indexOf('=');
    if (idx < 0) {
      return KvPair(key: Uri.decodeQueryComponent(part), value: '');
    }
    return KvPair(
      key: Uri.decodeQueryComponent(part.substring(0, idx)),
      value: Uri.decodeQueryComponent(part.substring(idx + 1)),
    );
  }).toList();
}

String _maybeReadFile(String value) {
  if (value.startsWith('@')) {
    final path = value.substring(1);
    final file = File(path);
    if (file.existsSync()) {
      return file.readAsStringSync();
    }
  }
  return value;
}

bool _looksLikeJson(String s) {
  final t = s.trim();
  if (t.isEmpty) return false;
  if (!(t.startsWith('{') || t.startsWith('['))) return false;
  try {
    json.decode(t);
    return true;
  } catch (_) {
    return false;
  }
}

bool _looksLikeForm(String s) {
  if (!s.contains('=') || s.trim().startsWith('{') || s.trim().startsWith('[')) {
    return false;
  }
  return !s.contains('\n') && s.split('&').every((p) => p.contains('=') || p.isEmpty);
}

String _bashQuote(String s) {
  if (s.isEmpty) return "''";
  return "'${s.replaceAll("'", r"'\''")}'";
}
