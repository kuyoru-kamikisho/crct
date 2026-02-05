import 'package:path/path.dart' as path;
import 'package:flutter/material.dart';
import 'package:keywin/tools/path_find.dart';

class AppInfoProvider extends ChangeNotifier {
  String appDir = '';
  String keyMonitorExePath = '';

  void loadAppDir() async {
    appDir = await AppDirectory.getExecutableDirectory();
    keyMonitorExePath = path.normalize(path.join(appDir,'./plugins/keyMonitor.exe'));
    notifyListeners();
  }
}

class EventRecordProvider extends ChangeNotifier {
  List<String> eventsRecord = [];

  void addEventString(String str) {
    eventsRecord.add(str);
    notifyListeners();
  }

  void resetEventRecord() {
    eventsRecord.clear();
    notifyListeners();
  }
}

class FileListProvider extends ChangeNotifier {
  List<String> fileList = [];

  void addEventString(String str) {
    fileList.add(str);
    notifyListeners();
  }

  void resetEventRecord() {
    fileList.clear();
    notifyListeners();
  }
}
