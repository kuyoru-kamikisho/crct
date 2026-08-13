# Postwoman

轻量 Windows 接口测试工具。支持 HTTP 常用方法、流式响应（含 SSE）、WebSocket，以及 bash curl 导入/导出。

## 开发运行

```bash
flutter run -d windows
```

## 打成单文件 exe

```powershell
.\pack.ps1
```

产物是 `dist\postwoman.exe`。把这一个文件拷到任意目录即可运行，不需要旁边再放 dll。
