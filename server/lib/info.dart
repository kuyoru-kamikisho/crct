bool appWelcome({String lang = 'jp'}) {
  var ver = '1.0.0';
  var hko = '2024';
  var zh = '\n'
      '欢迎来到『密语馨声』！\n'
      '版本：$ver\n'
      '作者：玖夜kuyoru\n'
      '发行：$hko\n'
      '\n';
  var en = '\n'
      'Welcome to Whispering Melody! \n'
      'version: $ver\n'
      'author: kuyoru\n'
      'release: $hko\n'
      '\n';
  var jp = '\n'
      '『密語馨声』へようこそ！\n'
      'バージョン：$ver\n'
      '作者：玖夜kuyoru\n'
      '発行：$hko\n'
      '\n';
  var welStr = lang == 'zh'
      ? zh
      : lang == 'en'
          ? en
          : jp;
  print(welStr);
  return true;
}
