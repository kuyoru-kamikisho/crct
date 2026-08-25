# HTTP Client

基于 Flutter 的桌面 HTTP 接口测试工具，交互方式对齐 JetBrains HTTP Client：用文本描述请求，语法高亮编辑，侧边播放按钮执行。

## 功能

- `.http` 文本编辑 + 语法高亮 + 格式化
- 左侧绿色播放按钮 / 一键运行全部
- 环境变量与内置变量
- curl（bash / cmd）导入并转换为 HTTP 文本
- HTTP / GraphQL / SSE 流式 / 文件下载 / WebSocket
- WebSocket 发送输入框
- 下方响应 Tab 面板
- 历史记录
- 黑灰 / 明亮主题，直角 UI（border-radius = 0）
- 本地数据保存在 **exe 同级** `http_client_data/`（不使用 AppData）

## 快速开始

```bash
flutter pub get
flutter run -d windows
flutter test
```

详细说明见 [docs/使用说明书.md](docs/使用说明书.md)。

## 目录结构

```
lib/
  main.dart
  models/          # 数据模型
  parser/          # .http 解析、高亮、格式化、curl 导入、变量
  services/        # 路径、存储、请求执行
  state/           # 应用状态
  theme/           # 主题（直角）
  widgets/         # 编辑器、响应面板、对话框
assets/
  examples.http
test/              # 单元测试
docs/使用说明书.md
```
