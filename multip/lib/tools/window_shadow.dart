import 'dart:ffi';
import 'dart:io';
import 'package:bitsdojo_window/bitsdojo_window.dart';
import 'package:ffi/ffi.dart';

void removeWindows11RoundedCorners() {
  if (Platform.isWindows) {
    try {
      final user32 = DynamicLibrary.open('user32.dll');

      final SetWindowCompositionAttribute = user32
          .lookupFunction<
            Int32 Function(
              IntPtr hWnd,
              Pointer<WINDOWCOMPOSITIONATTRIBDATA> data,
            ),
            int Function(int hWnd, Pointer<WINDOWCOMPOSITIONATTRIBDATA> data)
          >('SetWindowCompositionAttribute');

      final hwnd = appWindow.handle;

      // 创建 ACCENT_POLICY 结构体
      final accentPolicy = calloc<ACCENT_POLICY>();
      accentPolicy.ref.AccentState = 3; // ACCENT_ENABLE_BLURBEHIND
      accentPolicy.ref.AccentFlags = 2; // 绘制左右边框
      accentPolicy.ref.GradientColor = 0;
      accentPolicy.ref.AnimationId = 0;

      // 创建 WINDOWCOMPOSITIONATTRIBDATA 结构体
      final data = calloc<WINDOWCOMPOSITIONATTRIBDATA>();
      data.ref.Attribute = 19; // WCA_ACCENT_POLICY
      data.ref.Data = accentPolicy.cast();
      data.ref.SizeOfData = sizeOf<ACCENT_POLICY>();

      // 调用 API
      final result = SetWindowCompositionAttribute(hwnd!, data);

      if (result == 0) {
        print('设置窗口组合属性失败');
      }

      // 释放内存
      calloc.free(accentPolicy);
      calloc.free(data);
    } catch (e) {
      print('移除圆角时出错: $e');
    }
  }
}

// 定义必要的结构体
final class ACCENT_POLICY extends Struct {
  @Int32()
  external int AccentState;

  @Int32()
  external int AccentFlags;

  @Int32()
  external int GradientColor;

  @Int32()
  external int AnimationId;
}

final class WINDOWCOMPOSITIONATTRIBDATA extends Struct {
  @Int32()
  external int Attribute;

  external Pointer<Void> Data; // 移除 @Pointer() 注解

  @Int32()
  external int SizeOfData;
}
