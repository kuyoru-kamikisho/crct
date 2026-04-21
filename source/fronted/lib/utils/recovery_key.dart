import 'dart:math';

String randomRecoveryKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#\$%^&*()_+-=';
  final random = Random.secure();
  final length = 24 + random.nextInt(8);
  final sb = StringBuffer();
  for (int i = 0; i < length; i++) {
    sb.write(chars[random.nextInt(chars.length)]);
  }
  return sb.toString();
}
