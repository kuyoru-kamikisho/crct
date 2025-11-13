## 简易使用例子

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

## vcpkg依赖

### openssl

` .\vcpkg.exe install openssl`

#### 在 Visual Studio 中配置项目

假设你已经将OpenSSL的库文件放到了 `C:\OpenSSL-Win64` 目录下（请根据你的实际路径调整），接下来按步骤配置你的项目。

1. 打开项目属性：在解决方案资源管理器中，右键点击你的项目，选择 “属性”。
   配置包含目录：

   在属性页中，进入 C/C++ -> 常规。

   找到 “附加包含目录”，点击下拉箭头后点击 “编辑”。

   添加你的OpenSSL包含目录：C:\OpenSSL-Win64\include。

2. 配置库目录：

   进入 链接器 -> 常规。

   找到 “附加库目录”，点击 “编辑”。

   添加你的OpenSSL库文件目录：C:\OpenSSL-Win64\lib。

3. 添加依赖库：

   进入 链接器 -> 输入。

   找到 “附加依赖项”，点击 “编辑”。

   添加两个库文件名：libssl.lib 和 libcrypto.lib（早期的OpenSSL版本可能是 libeay32.lib 和 ssleay32.lib）。

4. 拷贝动态库 (DLLs)：

   将OpenSSL的 bin 目录（例如 C:\OpenSSL-Win64\bin）下的 libssl-3-x64.dll 和 libcrypto-3-x64.dll 等文件，复制到你的项目可执行文件 (.exe) 所在的目录下，通常是 Debug 或 Release 文件夹。

   或者，你也可以将包含DLL的目录路径添加到系统的 PATH 环境变量中。
