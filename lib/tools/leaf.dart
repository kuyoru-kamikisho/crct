/// int值不满两位数的进行补零
String padZero(int value) {
  return value.toString().padLeft(2, '0');
}

Map<int, String> jpWeekdays = {
  7: '日曜日',
  1: '月曜日',
  2: '火曜日',
  3: '水曜日',
  4: '木曜日',
  5: '金曜日',
  6: '土曜日',
};
