import 'dart:ffi';
import 'dart:io';
import 'package:ffi/ffi.dart';
import 'package:path/path.dart' as path;

class AutoInput {
  late DynamicLibrary _dll;

  AutoInput() {
    _loadDll();
  }

  // 加载动态库
  void _loadDll() {
    final libPath = Platform.isMacOS
        ? path.join(
            Directory.current.path,
            'plugins',
            'keys',
            'autoInput.dylib',
          )
        : Platform.isWindows
        ? path.join(Directory.current.path, 'plugins', 'keys', 'autoInput.dll')
        : path.join(Directory.current.path, 'plugins', 'keys', 'autoInput.so');

    _dll = DynamicLibrary.open(libPath);
  }

  // 声明你在 DLL 中导出的函数
  // 键盘按下事件
  void keyDown(String keyName, [int durationMs = 0]) {
    final keyDownFunc = _dll
        .lookupFunction<
          Int32 Function(Pointer<Utf8> keyName, Int32 durationMs),
          int Function(Pointer<Utf8> keyName, int durationMs)
        >('KeyDown');

    final keyNamePtr = keyName.toNativeUtf8();
    keyDownFunc(keyNamePtr, durationMs);
    calloc.free(keyNamePtr);
  }

  // 键盘松开事件
  void keyUp(String keyName) {
    final keyUpFunc = _dll
        .lookupFunction<
          Int32 Function(Pointer<Utf8> keyName),
          int Function(Pointer<Utf8> keyName)
        >('KeyUp');

    final keyNamePtr = keyName.toNativeUtf8();
    keyUpFunc(keyNamePtr);
    calloc.free(keyNamePtr);
  }

  // 鼠标移动到指定位置
  void mouseMoveAt(int x, int y) {
    final mouseMoveAtFunc = _dll
        .lookupFunction<
          Int32 Function(Int32 x, Int32 y),
          int Function(int x, int y)
        >('MouseMoveAt');

    mouseMoveAtFunc(x, y);
  }

  // 左键点击
  void leftClick(int x, int y) {
    final leftClickFunc = _dll
        .lookupFunction<
          Int32 Function(Int32 x, Int32 y),
          int Function(int x, int y)
        >('LeftClick');

    leftClickFunc(x, y);
  }

  // 右键点击
  void rightClick(int x, int y) {
    final rightClickFunc = _dll
        .lookupFunction<
          Int32 Function(Int32 x, Int32 y),
          int Function(int x, int y)
        >('RightClick');

    rightClickFunc(x, y);
  }

  // 滚轮事件
  void scroll(String direction, int x, int y, int distance) {
    final scrollFunc = _dll
        .lookupFunction<
          Int32 Function(
            Pointer<Utf8> direction,
            Int32 x,
            Int32 y,
            Int32 distance,
          ),
          int Function(Pointer<Utf8> direction, int x, int y, int distance)
        >('Scroll');

    final directionPtr = direction.toNativeUtf8();
    scrollFunc(directionPtr, x, y, distance);
    calloc.free(directionPtr);
  }

  // 按下左键并保持
  void leftDown(int x, int y) {
    final leftDownFunc = _dll
        .lookupFunction<
          Int32 Function(Int32 x, Int32 y),
          int Function(int x, int y)
        >('LeftDown');

    leftDownFunc(x, y);
  }

  // 松开左键
  void leftUp(int x, int y) {
    final leftUpFunc = _dll
        .lookupFunction<
          Int32 Function(Int32 x, Int32 y),
          int Function(int x, int y)
        >('LeftUp');

    leftUpFunc(x, y);
  }

  // 按下右键并保持
  void rightDown(int x, int y) {
    final rightDownFunc = _dll
        .lookupFunction<
          Int32 Function(Int32 x, Int32 y),
          int Function(int x, int y)
        >('RightDown');

    rightDownFunc(x, y);
  }

  // 松开右键
  void rightUp(int x, int y) {
    final rightUpFunc = _dll
        .lookupFunction<
          Int32 Function(Int32 x, Int32 y),
          int Function(int x, int y)
        >('RightUp');

    rightUpFunc(x, y);
  }

  // 按下中键并保持
  void middleDown(int x, int y) {
    final middleDownFunc = _dll
        .lookupFunction<
          Int32 Function(Int32 x, Int32 y),
          int Function(int x, int y)
        >('MiddleDown');

    middleDownFunc(x, y);
  }

  // 松开中键
  void middleUp(int x, int y) {
    final middleUpFunc = _dll
        .lookupFunction<
          Int32 Function(Int32 x, Int32 y),
          int Function(int x, int y)
        >('MiddleUp');

    middleUpFunc(x, y);
  }

  // 点击中键
  void middleClick(int x, int y) {
    final middleClickFunc = _dll
        .lookupFunction<
          Int32 Function(Int32 x, Int32 y),
          int Function(int x, int y)
        >('MiddleClick');

    middleClickFunc(x, y);
  }
}
