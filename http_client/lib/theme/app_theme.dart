import 'package:flutter/material.dart';

/// 全局直角：所有组件 border-radius 为 0。
const BorderRadius kZeroRadius = BorderRadius.zero;

final OutlinedBorder kSquareBorder = RoundedRectangleBorder(
  borderRadius: kZeroRadius,
);

class HighlightScheme {
  const HighlightScheme({
    required this.comment,
    required this.separator,
    required this.methodGet,
    required this.methodPost,
    required this.methodPut,
    required this.methodDelete,
    required this.methodPatch,
    required this.methodOther,
    required this.url,
    required this.headerKey,
    required this.headerValue,
    required this.jsonKey,
    required this.jsonString,
    required this.jsonNumber,
    required this.jsonLiteral,
    required this.variable,
    required this.fileRef,
    required this.body,
    required this.annotation,
  });

  final Color comment;
  final Color separator;
  final Color methodGet;
  final Color methodPost;
  final Color methodPut;
  final Color methodDelete;
  final Color methodPatch;
  final Color methodOther;
  final Color url;
  final Color headerKey;
  final Color headerValue;
  final Color jsonKey;
  final Color jsonString;
  final Color jsonNumber;
  final Color jsonLiteral;
  final Color variable;
  final Color fileRef;
  final Color body;
  final Color annotation;

  Color methodColor(String method) {
    switch (method.toUpperCase()) {
      case 'GET':
      case 'HEAD':
        return methodGet;
      case 'POST':
      case 'GRAPHQL':
        return methodPost;
      case 'PUT':
        return methodPut;
      case 'DELETE':
        return methodDelete;
      case 'PATCH':
        return methodPatch;
      default:
        return methodOther;
    }
  }
}

class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.editorBg,
    required this.gutterBg,
    required this.toolbarBg,
    required this.panelBg,
    required this.border,
    required this.hover,
    required this.play,
    required this.playIcon,
    required this.success,
    required this.danger,
    required this.warning,
    required this.dimText,
    required this.accent,
    required this.tabBarBg,
    required this.highlight,
    required this.statusOkBg,
    required this.statusErrBg,
  });

  final Color editorBg;
  final Color gutterBg;
  final Color toolbarBg;
  final Color panelBg;
  final Color border;
  final Color hover;
  final Color play;
  final Color playIcon;
  final Color success;
  final Color danger;
  final Color warning;
  final Color dimText;
  final Color accent;
  final Color tabBarBg;
  final HighlightScheme highlight;
  final Color statusOkBg;
  final Color statusErrBg;

  static AppColors of(BuildContext context) {
    return Theme.of(context).extension<AppColors>()!;
  }

  @override
  AppColors copyWith({
    Color? editorBg,
    Color? gutterBg,
    Color? toolbarBg,
    Color? panelBg,
    Color? border,
    Color? hover,
    Color? play,
    Color? playIcon,
    Color? success,
    Color? danger,
    Color? warning,
    Color? dimText,
    Color? accent,
    Color? tabBarBg,
    HighlightScheme? highlight,
    Color? statusOkBg,
    Color? statusErrBg,
  }) {
    return AppColors(
      editorBg: editorBg ?? this.editorBg,
      gutterBg: gutterBg ?? this.gutterBg,
      toolbarBg: toolbarBg ?? this.toolbarBg,
      panelBg: panelBg ?? this.panelBg,
      border: border ?? this.border,
      hover: hover ?? this.hover,
      play: play ?? this.play,
      playIcon: playIcon ?? this.playIcon,
      success: success ?? this.success,
      danger: danger ?? this.danger,
      warning: warning ?? this.warning,
      dimText: dimText ?? this.dimText,
      accent: accent ?? this.accent,
      tabBarBg: tabBarBg ?? this.tabBarBg,
      highlight: highlight ?? this.highlight,
      statusOkBg: statusOkBg ?? this.statusOkBg,
      statusErrBg: statusErrBg ?? this.statusErrBg,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    return t < 0.5 ? this : other;
  }

  static const dark = AppColors(
    editorBg: Color(0xFF1E1F22),
    gutterBg: Color(0xFF2B2D30),
    toolbarBg: Color(0xFF2B2D30),
    panelBg: Color(0xFF2B2D30),
    border: Color(0xFF3E3F43),
    hover: Color(0xFF3C3F41),
    play: Color(0xFF59A869),
    playIcon: Color(0xFFFFFFFF),
    success: Color(0xFF59A869),
    danger: Color(0xFFE35252),
    warning: Color(0xFFD5B778),
    dimText: Color(0xFF9DA0A8),
    accent: Color(0xFF548AF7),
    tabBarBg: Color(0xFF2B2D30),
    statusOkBg: Color(0xFF1F3A2A),
    statusErrBg: Color(0xFF3A1F1F),
    highlight: HighlightScheme(
      comment: Color(0xFF7A7E85),
      separator: Color(0xFF6F737A),
      methodGet: Color(0xFF62AE67),
      methodPost: Color(0xFFD19A66),
      methodPut: Color(0xFF61AFEF),
      methodDelete: Color(0xFFE06C75),
      methodPatch: Color(0xFFC678DD),
      methodOther: Color(0xFF56B6C2),
      url: Color(0xFFDFE1E5),
      headerKey: Color(0xFF9DA0A8),
      headerValue: Color(0xFFA9B7C6),
      jsonKey: Color(0xFF6AAB73),
      jsonString: Color(0xFFA8C77B),
      jsonNumber: Color(0xFF6897BB),
      jsonLiteral: Color(0xFFCC7832),
      variable: Color(0xFFD5B778),
      fileRef: Color(0xFF56B6C2),
      body: Color(0xFFA9B7C6),
      annotation: Color(0xFFC678DD),
    ),
  );

  static const light = AppColors(
    editorBg: Color(0xFFFFFFFF),
    gutterBg: Color(0xFFF2F3F5),
    toolbarBg: Color(0xFFF7F8FA),
    panelBg: Color(0xFFF7F8FA),
    border: Color(0xFFD4D6DB),
    hover: Color(0xFFE8EAED),
    play: Color(0xFF3D9A55),
    playIcon: Color(0xFFFFFFFF),
    success: Color(0xFF2E7D4F),
    danger: Color(0xFFC64242),
    warning: Color(0xFFB8860B),
    dimText: Color(0xFF6F737A),
    accent: Color(0xFF3164D8),
    tabBarBg: Color(0xFFF2F3F5),
    statusOkBg: Color(0xFFE6F4EA),
    statusErrBg: Color(0xFFFCE8E8),
    highlight: HighlightScheme(
      comment: Color(0xFF8A8F98),
      separator: Color(0xFF9AA0A8),
      methodGet: Color(0xFF2E7D4F),
      methodPost: Color(0xFFC46A1B),
      methodPut: Color(0xFF2B6CB0),
      methodDelete: Color(0xFFC64242),
      methodPatch: Color(0xFF8A3FA6),
      methodOther: Color(0xFF1A8A99),
      url: Color(0xFF1E1E1E),
      headerKey: Color(0xFF6F737A),
      headerValue: Color(0xFF2B2D30),
      jsonKey: Color(0xFF2E7D4F),
      jsonString: Color(0xFF3D7A1F),
      jsonNumber: Color(0xFF1D5A8F),
      jsonLiteral: Color(0xFFB35C00),
      variable: Color(0xFF9A6B12),
      fileRef: Color(0xFF1A8A99),
      body: Color(0xFF2B2D30),
      annotation: Color(0xFF8A3FA6),
    ),
  );
}

ThemeData buildAppTheme({required bool dark}) {
  final colors = dark ? AppColors.dark : AppColors.light;
  final base = dark ? ThemeData.dark(useMaterial3: true) : ThemeData.light(useMaterial3: true);
  final scheme = dark
      ? const ColorScheme.dark(
          surface: Color(0xFF2B2D30),
          primary: Color(0xFF548AF7),
          onSurface: Color(0xFFDFE1E5),
          onPrimary: Colors.white,
        )
      : const ColorScheme.light(
          surface: Color(0xFFF7F8FA),
          primary: Color(0xFF3164D8),
          onSurface: Color(0xFF1E1E1E),
          onPrimary: Colors.white,
        );

  InputBorder squareInput([Color? c]) => OutlineInputBorder(
        borderRadius: kZeroRadius,
        borderSide: BorderSide(color: c ?? colors.border),
      );

  return base.copyWith(
    colorScheme: scheme,
    scaffoldBackgroundColor: colors.toolbarBg,
    splashFactory: InkRipple.splashFactory,
    visualDensity: VisualDensity.compact,
    extensions: [colors],
    cardTheme: CardThemeData(
      color: colors.panelBg,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: kSquareBorder,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: colors.panelBg,
      elevation: 8,
      shape: kSquareBorder,
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: colors.panelBg,
      shape: kSquareBorder,
      elevation: 6,
    ),
    tooltipTheme: TooltipThemeData(
      waitDuration: const Duration(milliseconds: 400),
      decoration: BoxDecoration(color: dark ? const Color(0xFF3C3F41) : const Color(0xFF2B2D30)),
      textStyle: TextStyle(color: dark ? const Color(0xFFDFE1E5) : Colors.white, fontSize: 12),
    ),
    dividerTheme: DividerThemeData(color: colors.border, space: 1, thickness: 1),
    tabBarTheme: TabBarThemeData(
      indicatorSize: TabBarIndicatorSize.tab,
      dividerColor: colors.border,
      labelColor: scheme.primary,
      unselectedLabelColor: colors.dimText,
      indicator: UnderlineTabIndicator(
        borderSide: BorderSide(color: scheme.primary, width: 2),
        borderRadius: kZeroRadius,
      ),
      overlayColor: WidgetStatePropertyAll(colors.hover),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(
        shape: kSquareBorder,
        hoverColor: colors.hover,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        shape: kSquareBorder,
        elevation: 0,
        backgroundColor: scheme.primary,
        foregroundColor: scheme.onPrimary,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(shape: kSquareBorder),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        shape: kSquareBorder,
        side: BorderSide(color: colors.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      isDense: true,
      filled: true,
      fillColor: colors.editorBg,
      border: squareInput(),
      enabledBorder: squareInput(),
      focusedBorder: squareInput(scheme.primary),
      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
    ),
    scrollbarTheme: ScrollbarThemeData(
      thumbVisibility: const WidgetStatePropertyAll(true),
      radius: Radius.zero,
      thickness: const WidgetStatePropertyAll(8),
    ),
    menuTheme: MenuThemeData(
      style: MenuStyle(
        shape: WidgetStatePropertyAll(kSquareBorder),
        backgroundColor: WidgetStatePropertyAll(colors.panelBg),
      ),
    ),
    dropdownMenuTheme: DropdownMenuThemeData(
      inputDecorationTheme: InputDecorationTheme(
        border: squareInput(),
        enabledBorder: squareInput(),
        filled: true,
        fillColor: colors.editorBg,
      ),
      menuStyle: MenuStyle(
        shape: WidgetStatePropertyAll(kSquareBorder),
        backgroundColor: WidgetStatePropertyAll(colors.panelBg),
      ),
    ),
  );
}
