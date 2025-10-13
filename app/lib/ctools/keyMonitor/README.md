#### 简易使用例子

```dart
import 'dart:ffi';
import 'dart:io';
import 'package:ffi/ffi.dart';

typedef StartListeningFunc = Int32 Function(Pointer<NativeFunction<Void Function(Pointer<Utf8>)>>);
typedef StopListeningFunc = Void Function();
typedef IsListeningFunc = Int32 Function();

class InputHook {
  static final DynamicLibrary _library = Platform.isWindows 
      ? DynamicLibrary.open('InputHook.dll')
      : DynamicLibrary.process();

  static final _startListening = _library
      .lookup<NativeFunction<StartListeningFunc>>('StartListening')
      .asFunction<int Function(Pointer<NativeFunction<Void Function(Pointer<Utf8>)>>)>();

  static final _stopListening = _library
      .lookup<NativeFunction<StopListeningFunc>>('StopListening')
      .asFunction<void Function()>();

  static final _isListening = _library
      .lookup<NativeFunction<IsListeningFunc>>('IsListening')
      .asFunction<int Function()>();

  // 回调函数
  static void _onEvent(Pointer<Utf8> eventStr) {
    String event = eventStr.toDartString();
    print('Input Event: $event');
    // 在这里处理事件，比如通过StreamController发送给UI
  }

  static final _callbackPointer = Pointer.fromFunction<Void Function(Pointer<Utf8>)>(_onEvent);

  static bool startListening() {
    return _startListening(_callbackPointer) != 0;
  }

  static void stopListening() {
    _stopListening();
  }

  static bool isListening() {
    return _isListening() != 0;
  }
}

// 使用示例
void main() {
  // 开始监听
  if (InputHook.startListening()) {
    print('开始监听输入事件...');
  } else {
    print('启动监听失败');
  }

  // 在需要的时候停止监听
  // InputHook.stopListening();
}
```