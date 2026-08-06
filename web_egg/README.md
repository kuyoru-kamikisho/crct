# WebEgg

轻量级 **Web 项目程序外壳**，用于把大屏、自助机等 Web 应用包装成可交付的桌面程序。

基于 Electron，启动快、可打包成 Windows 安装包，并提供丰富的 `window.webEgg` 通信 API。

## 功能概览

- 首次启动进入设置页，保存后写入 `config.json`，之后直接打开项目 URL
- Web 页面与外壳双向通信（窗口控制、日志、设备信息、执行外部程序等）
- 单实例 / 多开可配置
- 自定义自动更新（`version.json` + 静默下载，下次启动安装）
- 可打包为 NSIS 安装程序（`.exe`）

## 快速开始

### 环境要求

- Node.js 18+（推荐 20/22）
- Windows 10/11

### 安装与运行

```bash
npm install
npm start
```

首次启动会打开设置页。也可直接用演示页验证 API：

1. 启动软件，在设置里把 **项目 URL** 填为本地演示页绝对路径，例如：
   - `file:///D:/code/crct/web_egg/examples/demo.html`
2. 保存并启动，即可点击按钮测试通信接口

### 重新配置

删除软件目录下的 `config.json` 后重启，会再次进入设置页。

开发模式下配置文件位于项目根目录；安装后位于安装目录（与 `WebEgg.exe` 同级）。

## 配置项

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `projectName` | string | `""` | 项目名称（窗口标题） |
| `projectId` | string | `""` | 项目 ID |
| `projectUrl` | string | `""` | 启动加载的 Web URL（必填） |
| `logPath` | string | `./logs/` | 日志目录（相对路径相对软件目录） |
| `fullscreen` | boolean | `false` | 启动全屏 |
| `alwaysOnTop` | boolean | `false` | 窗口置顶 |
| `showFrame` | boolean | `true` | 是否显示系统标题栏边框 |
| `extraInfo` | string | `""` | 附加信息（可放 JSON，供 Web 读取） |
| `allowMultiInstance` | boolean | `false` | 是否允许多开 |
| `updateUrl` | string | `""` | 自动更新基地址 |
| `openDevTools` | boolean | `false` | 启动时打开 DevTools |
| `windowWidth` | number | `1280` | 窗口宽度 |
| `windowHeight` | number | `800` | 窗口高度 |
| `startMaximized` | boolean | `false` | 启动最大化 |
| `kiosk` | boolean | `false` | Kiosk 模式 |
| `userAgent` | string | `""` | 自定义 UA |
| `zoomFactor` | number | `1` | 缩放比例 |
| `confirmOnClose` | boolean | `false` | 关闭前确认 |
| `ignoreCertificateErrors` | boolean | `false` | 忽略证书错误 |
| `hardwareAcceleration` | boolean | `true` | 硬件加速 |
| `proxyRules` | string | `""` | 代理规则 |
| `backgroundColor` | string | `#0f1419` | 窗口背景色 |
| `muteAudio` | boolean | `false` | 静音 |
| `autoHideMenuBar` | boolean | `true` | 隐藏菜单栏 |
| `disableWebSecurity` | boolean | `false` | 关闭 Web 安全（慎用） |

## 通信 API

业务页面通过预加载脚本注入的全局对象调用：

```js
window.webEgg   // 推荐
window.WebEgg   // 别名
```

所有方法均返回 `Promise`。

### 窗口控制

| 方法 | 说明 |
|------|------|
| `close()` | 退出软件 |
| `minimize()` | 最小化 |
| `maximize()` | 最大化 / 还原切换 |
| `unmaximize()` | 取消最大化 |
| `isMaximized()` | 是否最大化 |
| `fullscreen(enable?)` | 全屏 / 退出全屏（同步写入配置） |
| `isFullscreen()` | 是否全屏 |
| `focus()` / `blur()` | 获得 / 失去焦点 |
| `setAlwaysOnTop(enable?)` | 置顶（同步写入配置） |
| `isAlwaysOnTop()` | 是否置顶 |
| `show()` / `hide()` | 显示 / 隐藏窗口 |
| `setSize(w, h)` / `getSize()` | 设置 / 获取尺寸 |
| `setPosition(x, y)` / `getPosition()` | 设置 / 获取位置 |
| `center()` | 窗口居中 |
| `setTitle(title)` | 设置标题 |
| `setKiosk(enable?)` | Kiosk 模式 |
| `flashFrame(enable?)` | 任务栏闪烁 |

### DevTools

| 方法 | 说明 |
|------|------|
| `openDevTools()` | 打开调试控制台 |
| `closeDevTools()` | 关闭 |
| `toggleDevTools()` | 切换 |

### 配置与日志

| 方法 | 说明 |
|------|------|
| `getConfig()` | 获取全部配置 |
| `setConfig(partial)` | 部分更新配置并写盘 |
| `getExtraInfo()` | 获取附加信息 |
| `setExtraInfo(info)` | 设置附加信息 |
| `writeLog(message)` | 向软件日志写入一条记录 |

### 设备与路径

| 方法 | 说明 |
|------|------|
| `getDeviceInfo()` | 屏幕、CPU、内存、系统等信息 |
| `getAppVersion()` | 软件版本号 |
| `getAppPath()` | 软件目录、exe、配置/日志路径等 |

### 外部程序与系统

| 方法 | 说明 |
|------|------|
| `exec(command, args?, options?)` | 执行外部程序（exe/cmd/bat 等） |
| `openPath(path)` | 用系统默认方式打开路径 |
| `openExternal(url)` | 用系统浏览器打开 URL |
| `clipboardWrite(text)` / `clipboardRead()` | 剪贴板读写 |
| `notify(title, body)` | 系统通知 |

`exec` 示例：

```js
await window.webEgg.exec('notepad.exe', [], { detached: true });

await window.webEgg.exec('cmd.exe', ['/c', 'echo hello'], {
  shell: false,
  timeout: 5000
});
```

### 页面控制

| 方法 | 说明 |
|------|------|
| `reload(ignoreCache?)` | 刷新 |
| `navigate(url)` | 跳转并更新配置中的 URL |
| `goBack()` / `goForward()` | 前进后退 |
| `setZoomFactor(n)` / `getZoomFactor()` | 缩放 |
| `clearCache()` | 清缓存 |
| `print(options?)` | 打印 |

### 生命周期与更新

| 方法 | 说明 |
|------|------|
| `restart()` | 重启软件 |
| `checkUpdate()` | 立即检查并静默下载更新 |
| `getUpdateStatus()` | 查看已下载待安装的更新信息 |

### 事件（软件 → Web）

```js
const off = window.webEgg.on('egg:event:focus', () => {
  console.log('窗口获得焦点');
});
// off() 可取消订阅
```

可用事件：

- `egg:event:focus` / `egg:event:blur`
- `egg:event:resize`（`{ width, height }`）
- `egg:event:fullscreen`（`true|false`）
- `egg:event:maximize` / `egg:event:unmaximize`
- `egg:event:before-close`
- `egg:event:update-available`
- `egg:event:config-changed`

## 自动更新

设置 `updateUrl` 例如 `http://www.example.com/update/`，启动后会请求：

```text
http://www.example.com/update/version.json
```

`version.json` 格式：

```json
{
  "version": "1.0.3",
  "download_url": "http://www.example.com/update/WebEgg-Setup-1.0.3.exe",
  "update_log": "更新说明，支持换行"
}
```

流程：

1. 远程版本号大于当前版本 → **静默下载**安装包到 `updates/pending-setup.exe`
2. 本次不打断用户使用
3. **下次启动**若检测到已下载的新版本 → 拉起外置 `updater-helper.js` → 退出主程序 → 静默安装 → 自动重新启动

仓库内提供了示例：`update-server/version.json`。

## 打包安装程序

```bash
npm run dist
```

产物在 `dist/` 目录，例如：

```text
WebEgg-Setup-1.0.0.exe
```

打包使用 `electron-builder` + NSIS，可自定义安装目录、创建桌面/开始菜单快捷方式。

## 目录结构

```text
web_egg/
├── electron/                 # 主进程
│   ├── main.js
│   ├── preload.js            # 业务页桥接
│   ├── settings-preload.js   # 设置页桥接
│   └── modules/              # 配置 / 日志 / 更新 / 设备信息
├── renderer/settings/        # 设置页 UI
├── scripts/updater-helper.js # 更新安装助手
├── examples/demo.html        # API 演示页
├── update-server/            # 更新 JSON 示例
├── build/icon.ico
└── package.json
```

## 说明

- 删除 `config.json` 可恢复首次设置流程
- 日志默认写入软件目录下 `logs/YYYY-MM-DD.log`
- 与配置相关的 API（全屏、置顶、DevTools、窗口尺寸、URL、附加信息等）会同步更新配置文件
- 原 Visual Studio Win32 空模板文件仍保留在仓库中，实际运行与打包以 Electron 工程为准

## License

MIT
