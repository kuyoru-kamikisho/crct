import 'package:flutter/material.dart';

class EventRecordProvider extends ChangeNotifier {
  List<String> eventsRecord = [];

  void addEventString(String str){
    eventsRecord.add(str);
    notifyListeners();
  }

  void resetEventRecord(){
    eventsRecord.clear();
    notifyListeners();
  }
}

class FileListProvider extends ChangeNotifier {
  List<String> fileList = [];

  void addEventString(String str){
    fileList.add(str);
    notifyListeners();
  }

  void resetEventRecord(){
    fileList.clear();
    notifyListeners();
  }
}