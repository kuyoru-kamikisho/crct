/// int值不满两位数的进行补零
String padZero(int value) {
  return value.toString().padLeft(2, '0');
}

Map<int, String> jpWeekdays = {
  1: '日曜日',
  2: '月曜日',
  3: '火曜日',
  4: '水曜日',
  5: '木曜日',
  6: '金曜日',
  7: '土曜日',
};
