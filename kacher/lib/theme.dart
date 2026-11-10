import 'package:flutter/material.dart';

const kBg = Color(0xFF0E1014);
const kSidebar = Color(0xFF14171E);
const kPanel = Color(0xFF181B22);
const kLine = Color(0xFF2A2F3A);
const kText = Color(0xFFE7E9EF);
const kMuted = Color(0xFF9399A6);
const kAccent = Color(0xFF8EB4FF);
const kDanger = Color(0xFFFF6B6B);
const kOk = Color(0xFF6EE7C5);

ThemeData buildKacherTheme() {
  const scheme = ColorScheme.dark(
    primary: kAccent,
    onPrimary: Color(0xFF0E1014),
    secondary: kOk,
    surface: kPanel,
    onSurface: kText,
    error: kDanger,
  );
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    scaffoldBackgroundColor: kBg,
    fontFamily: 'Microsoft YaHei UI',
    fontFamilyFallback: const ['Microsoft YaHei', 'Segoe UI'],
    visualDensity: VisualDensity.compact,
    splashFactory: NoSplash.splashFactory,
    highlightColor: const Color(0x228EB4FF),
    dividerColor: kLine,
    dialogTheme: const DialogThemeData(
      backgroundColor: kPanel,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: Color(0xFF2A3142),
      contentTextStyle: TextStyle(color: kText, fontSize: 13),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        visualDensity: VisualDensity.compact,
        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        visualDensity: VisualDensity.compact,
        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      isDense: true,
      filled: true,
      fillColor: const Color(0xFF12151C),
      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      labelStyle: const TextStyle(color: kMuted, fontSize: 12),
      hintStyle: const TextStyle(color: kMuted, fontSize: 13),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kLine)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kLine)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kAccent)),
    ),
  );
}

class Panel extends StatelessWidget {
  const Panel({required this.child, super.key, this.padding});

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: kPanel,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: kLine),
      ),
      child: Padding(
        padding: padding ?? const EdgeInsets.all(12),
        child: child,
      ),
    );
  }
}
