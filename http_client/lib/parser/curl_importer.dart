import '../utils/helpers.dart';

class CurlCommand {
  CurlCommand({
    this.method = 'GET',
    this.url = '',
    Map<String, String>? headers,
    this.body = '',
    this.outputFile,
    this.insecure = false,
    this.followRedirect = false,
    this.isHead = false,
    List<CurlFormField>? formFields,
  })  : headers = headers ?? {},
        formFields = formFields ?? [];

  String method;
  String url;
  Map<String, String> headers;
  String body;
  String? outputFile;
  bool insecure;
  bool followRedirect;
  bool isHead;
  List<CurlFormField> formFields;

  String toHttp() {
    final buf = StringBuffer();
    buf.writeln('### imported from curl');
    if (insecure) buf.writeln('# @insecure');
    if (outputFile != null) buf.writeln('# @download');
    buf.writeln('$method $url');
    headers.forEach((k, v) {
      buf.writeln('$k: $v');
    });
    if (formFields.isNotEmpty) {
      if (!headers.keys.any((k) => k.toLowerCase() == 'content-type')) {
        buf.writeln('Content-Type: multipart/form-data');
      }
      buf.writeln();
      for (final f in formFields) {
        if (f.isFile) {
          buf.writeln('${f.name}: < ${f.value}');
        } else {
          buf.writeln('${f.name}: ${f.value}');
        }
      }
    } else if (body.isNotEmpty) {
      buf.writeln();
      buf.writeln(body);
    }
    if (outputFile != null) {
      buf.writeln('>> $outputFile');
    }
    return buf.toString();
  }
}

class CurlFormField {
  CurlFormField(this.name, this.value, {this.isFile = false});
  final String name;
  final String value;
  final bool isFile;
}

class CurlImporter {
  /// 将 bash curl / cmd curl / curl.exe 文本转换为 .http 格式。
  static String toHttp(String raw) => parse(raw).toHttp();

  static CurlCommand parse(String raw) {
    var src = stripShellPrompt(raw).trim();
    src = _flattenContinuations(src);
    if (src.isEmpty) {
      throw const FormatException('空的 curl 命令');
    }

    final args = tokenize(src);
    if (args.isEmpty) {
      throw const FormatException('无法解析 curl 命令');
    }

    var i = 0;
    if (args[0].toLowerCase() == 'sudo') i++;
    if (i >= args.length) {
      throw const FormatException('缺少 curl 可执行文件');
    }
    final bin = args[i].toLowerCase();
    if (bin != 'curl' && bin != 'curl.exe' && !bin.endsWith('\\curl.exe') && !bin.endsWith('/curl')) {
      final idx = args.indexWhere((a) => a.toLowerCase() == 'curl' || a.toLowerCase() == 'curl.exe');
      if (idx < 0) {
        throw FormatException('未找到 curl 命令: ${args[0]}');
      }
      i = idx;
    }

    i++;
    final cmd = CurlCommand();
    var dataGet = false;
    final dataParts = <String>[];
    var explicitMethod = false;

    while (i < args.length) {
      final a = args[i];
      if (a == '--') {
        i++;
        if (i < args.length) cmd.url = args[i];
        break;
      }
      if (!a.startsWith('-')) {
        if (cmd.url.isEmpty) cmd.url = _unquoteUrl(a);
        i++;
        continue;
      }

      String? optValue({required bool required}) {
        if (a.contains('=') && a.startsWith('--')) {
          return a.substring(a.indexOf('=') + 1);
        }
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          i++;
          return args[i];
        }
        if (required) {
          throw FormatException('选项 $a 缺少参数');
        }
        return null;
      }

      final flag = a;
      switch (flag) {
        case '-X':
        case '--request':
          cmd.method = (optValue(required: true) ?? 'GET').toUpperCase();
          explicitMethod = true;
          break;
        case '-XGET':
        case '-XPOST':
        case '-XPUT':
        case '-XPATCH':
        case '-XDELETE':
        case '-XHEAD':
        case '-XOPTIONS':
          cmd.method = flag.substring(2);
          explicitMethod = true;
          break;
        case '-H':
        case '--header':
          final h = optValue(required: true) ?? '';
          final colon = h.indexOf(':');
          if (colon > 0) {
            cmd.headers[h.substring(0, colon).trim()] = h.substring(colon + 1).trim();
          }
          break;
        case '-d':
        case '--data':
        case '--data-raw':
        case '--data-binary':
        case '--data-ascii':
          dataParts.add(optValue(required: true) ?? '');
          break;
        case '--data-urlencode':
          dataParts.add(optValue(required: true) ?? '');
          break;
        case '-F':
        case '--form':
        case '--form-string':
          final f = optValue(required: true) ?? '';
          cmd.formFields.add(_parseForm(f, isString: flag == '--form-string'));
          break;
        case '-u':
        case '--user':
          cmd.headers['Authorization'] = 'Basic ${optValue(required: true)}';
          break;
        case '-A':
        case '--user-agent':
          cmd.headers['User-Agent'] = optValue(required: true) ?? '';
          break;
        case '-e':
        case '--referer':
          cmd.headers['Referer'] = optValue(required: true) ?? '';
          break;
        case '-b':
        case '--cookie':
          cmd.headers['Cookie'] = optValue(required: true) ?? '';
          break;
        case '-I':
        case '--head':
          cmd.isHead = true;
          cmd.method = 'HEAD';
          explicitMethod = true;
          break;
        case '-G':
        case '--get':
          dataGet = true;
          break;
        case '-o':
        case '--output':
          cmd.outputFile = optValue(required: true);
          break;
        case '-k':
        case '--insecure':
          cmd.insecure = true;
          break;
        case '-L':
        case '--location':
          cmd.followRedirect = true;
          break;
        case '--url':
          cmd.url = _unquoteUrl(optValue(required: true) ?? '');
          break;
        case '-x':
        case '--proxy':
          optValue(required: true);
          break;
        default:
          if (flag.startsWith('-X') && flag.length > 2 && !flag.startsWith('--')) {
            cmd.method = flag.substring(2).toUpperCase();
            explicitMethod = true;
          } else if (flag.startsWith('--header=')) {
            final h = flag.substring('--header='.length);
            final colon = h.indexOf(':');
            if (colon > 0) {
              cmd.headers[h.substring(0, colon).trim()] = h.substring(colon + 1).trim();
            }
          } else if (flag.startsWith('--data=') || flag.startsWith('--data-raw=')) {
            dataParts.add(flag.substring(flag.indexOf('=') + 1));
          }
          break;
      }
      i++;
    }

    if (cmd.formFields.isNotEmpty) {
      if (!explicitMethod) cmd.method = 'POST';
    } else if (dataParts.isNotEmpty) {
      if (dataGet) {
        if (!explicitMethod) cmd.method = 'GET';
        final q = dataParts.join('&');
        cmd.url = cmd.url.contains('?') ? '${cmd.url}&$q' : '${cmd.url}?$q';
      } else {
        if (!explicitMethod) cmd.method = 'POST';
        cmd.body = dataParts.join('&');
        final hasCt = cmd.headers.keys.any((k) => k.toLowerCase() == 'content-type');
        if (!hasCt) {
          final looksJson = cmd.body.trim().startsWith('{') || cmd.body.trim().startsWith('[');
          cmd.headers['Content-Type'] =
              looksJson ? 'application/json' : 'application/x-www-form-urlencoded';
        }
      }
    } else if (cmd.isHead) {
      cmd.method = 'HEAD';
    }

    if (cmd.url.isEmpty) {
      throw const FormatException('curl 命令中没有 URL');
    }
    return cmd;
  }

  static String _flattenContinuations(String src) {
    var s = src.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    s = s.replaceAll(RegExp(r'\\\s*\n'), ' ');
    s = s.replaceAll(RegExp(r'\^\s*\n'), ' ');
    s = s.replaceAll(RegExp(r'`\s*\n'), ' ');
    return s;
  }

  static String _unquoteUrl(String u) {
    if ((u.startsWith("'") && u.endsWith("'")) || (u.startsWith('"') && u.endsWith('"'))) {
      return u.substring(1, u.length - 1);
    }
    return u;
  }

  static CurlFormField _parseForm(String raw, {required bool isString}) {
    final eq = raw.indexOf('=');
    if (eq < 0) return CurlFormField(raw, '');
    final name = raw.substring(0, eq);
    var value = raw.substring(eq + 1);
    var isFile = false;
    if (!isString && value.startsWith('@')) {
      isFile = true;
      value = value.substring(1);
    }
    return CurlFormField(name, value, isFile: isFile);
  }

  /// 将 bash/cmd 风格的 curl 命令拆成参数列表。
  static List<String> tokenize(String src) {
    final args = <String>[];
    final buf = StringBuffer();
    var i = 0;
    String? quote;

    void flush() {
      if (buf.isNotEmpty) {
        args.add(buf.toString());
        buf.clear();
      }
    }

    while (i < src.length) {
      final ch = src[i];
      if (quote == null) {
        if (ch == ' ' || ch == '\t' || ch == '\n') {
          flush();
          i++;
          continue;
        }
        if (ch == '"' || ch == "'") {
          quote = ch;
          i++;
          continue;
        }
        if (ch == '\\' && i + 1 < src.length) {
          buf.write(src[i + 1]);
          i += 2;
          continue;
        }
        buf.write(ch);
        i++;
      } else if (quote == "'") {
        // bash 单引号：字面量，仅 '' 可转义
        if (ch == "'") {
          if (i + 1 < src.length && src[i + 1] == "'") {
            buf.write("'");
            i += 2;
            continue;
          }
          quote = null;
          i++;
          continue;
        }
        buf.write(ch);
        i++;
      } else {
        // 双引号
        if (ch == '\\' && i + 1 < src.length) {
          final n = src[i + 1];
          if (n == '"' || n == '\\' || n == '\$' || n == '`') {
            buf.write(n);
            i += 2;
            continue;
          }
        }
        if (ch == '"') {
          quote = null;
          i++;
          continue;
        }
        buf.write(ch);
        i++;
      }
    }
    flush();
    return args;
  }
}
