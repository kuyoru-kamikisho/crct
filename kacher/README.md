# Kacher

Windows 上的操作录制与回放程序。界面用 Flutter，键鼠钩子、手柄采集、回放和悬浮图标用 C++。

生成的 exe 不用安装。日志、设置、录制文件和更新缓存都放在 exe 同级目录。

```powershell
flutter build windows --release
```

可执行文件在 `build\windows\x64\runner\Release\`。把整个 Release 目录拷走即可使用。

快捷键：

- `Ctrl+Alt+R` 开始录制
- `Ctrl+Alt+S` 停止
- `Ctrl+Alt+P` 播放当前选中项
- `Ctrl+Alt+Space` 暂停或继续

欢迎页也可以输入 `操作录制`、`播放`、`停止`、`暂停`、`已录制操作`、`设置` 后回车。

手柄回放需要把 `ViGEmClient.dll` 放在 exe 旁边，并安装 ViGEmBus。没有它时仍然回放键盘和鼠标。
