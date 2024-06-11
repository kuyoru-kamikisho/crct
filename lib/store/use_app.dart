import 'package:flutter/foundation.dart';

class UseApp with ChangeNotifier, DiagnosticableTreeMixin {
  final String _version = '1.0.0';

  String get version => _version;
}
