# Local Code Editor

仿 VS Code 的浏览器本地文本编辑器，基于 **Vite + React + TSX + Less Modules**，使用 Monaco Editor 提供语法高亮。

## 功能

- **新建文件**：无需先打开文件即可直接编辑
- **打开文件**：支持 File System Access API；不支持时降级为 `<input type="file">`
- **打开文件夹**：支持时在左侧展示目录树，可展开/收起子目录
- **失焦自动保存**：编辑器失去焦点且内容有改动时自动写入本地（或触发下载）
- **手动保存 / 下载**：工具栏「保存」按钮；API 不可用时改为下载
- **语法高亮**：根据扩展名自动识别语言（JS/TS/Python/JSON/CSS/Less 等）

## 浏览器支持

| 能力 | Chrome / Edge | Firefox / Safari |
|------|---------------|------------------|
| 打开 / 实时写入文件 | ✅ | ❌ → 下载降级 |
| 打开目录 | ✅ | ❌ |

> File System Access API 需要安全上下文（`localhost` 或 HTTPS）。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```
