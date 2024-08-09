import 'dart:io';

import 'package:server/info.dart';
import 'package:server/rest_register.dart';

void main(List<String> arguments) async {
  appWelcome();
  var server = await restRegister();

  print('【q】关闭服务并退出应用程序');
  var input = stdin.readLineSync();
  if (input == 'q') {
    server.close();
    exit(0);
  }
}
