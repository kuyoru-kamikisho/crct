# WebEgg — Android Web 外壳

将任意 Web 项目包裹为 Android 原生应用，适用于点餐平板、自助采购、电子签名等需要「程序外壳」的场景。

## 功能概览

- **首次启动配置**：填写项目信息后写入本地 `config.json`，之后直接进入 Web 页面
- **WebView 加载**：支持 HTTP/HTTPS、混合内容、自定义 UA、缓存开关
- **JS Bridge**：Web 与原生双向通信（退出、全屏、日志、配置、设备信息等）
- **本地日志**：按日写入日志文件
- **静默自动更新**：启动后后台拉取 `version.json` 并下载 APK，**下次启动**再提示安装
- **屏幕常亮 / 全屏 / 返回键策略**：适配平板常驻场景

## 快速开始

```bash
# 依赖
flutter pub get

# 运行（连接 Android 设备或模拟器）
flutter run

# 打包 APK
flutter build apk --release
```

产物路径：`build/app/outputs/flutter-apk/app-release.apk`

## 启动流程

1. 读取应用文档目录下的 `config.json`
2. 若无配置 → 进入设置页
3. 若有配置 → 检查是否已有待安装 APK，有则弹窗询问是否立即安装
4. 进入 WebView 加载 `projectUrl`
5. 后台根据 `updateUrl` 静默检查并下载新版本（不打断使用）

删除 `config.json` 可重新进入设置页。也可在 Web 页**左上角长按**唤出设置。

## 配置项

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `projectName` | string | `""` | 项目名称 |
| `projectId` | string | `""` | 项目 ID |
| `projectUrl` | string | `""` | 启动加载的 Web URL |
| `logPath` | string | `""` | 日志目录；空则使用应用文档目录 `/logs` |
| `fullscreen` | bool | `false` | 是否沉浸式全屏 |
| `extraInfo` | string | `""` | 附加信息（可放 JSON），供 Web 读取 |
| `updateUrl` | string | `""` | 自动更新基地址，如 `http://host/update/` |
| `userAgent` | string | `""` | 自定义 UA；空则系统默认 |
| `allowMixedContent` | bool | `true` | 允许 HTTPS 页加载 HTTP 资源 |
| `cacheEnabled` | bool | `true` | Web 缓存（预留开关） |
| `keepScreenOn` | bool | `false` | 屏幕常亮 |
| `hardwareBackAction` | string | `"webBack"` | `webBack` / `exit` / `ignore` |
| `bridgeSecret` | string | `""` | 可选；非空时 Web 调用须携带相同校验串 |

配置文件路径示例（因设备而异）：

`/data/user/0/com.crct.web_egg/app_flutter/config.json`

## JS Bridge API

页面加载完成后注入全局对象 `window.WebEgg`。建议在 `onReady` 后再调用：

```js
WebEgg.onReady(async () => {
  const cfg = await WebEgg.getConfig();
  console.log('extraInfo', cfg.extraInfo);

  const device = await WebEgg.getDeviceInfo();
  console.log(device.screen, device.android);

  await WebEgg.writeLog('page ready');
  await WebEgg.toast('外壳已连接');
});
```

### 方法列表

| 方法 | 说明 |
|------|------|
| `onReady(fn)` | 桥接就绪后回调 |
| `isReady()` | 是否已就绪 |
| `exitApp()` | 退出应用 |
| `setFullscreen(bool)` | 全屏，并写回配置 |
| `writeLog(string)` | 写入本地日志 |
| `getConfig()` | 获取全部配置（含 `extraInfo`） |
| `setConfig(partial)` | 部分更新配置并落盘 |
| `getDeviceInfo()` | 分辨率、屏幕尺寸、机型、CPU ABI、Android 版本、appVersion 等 |
| `getAppVersion()` | 当前外壳版本 |
| `reload()` | 刷新当前页 |
| `openUrl(url)` | 跳转到指定 URL |
| `clearCache()` | 清除 WebView 缓存与本地存储 |
| `setKeepScreenOn(bool)` | 屏幕常亮，并写回配置 |
| `toast(message)` | 原生 SnackBar 提示 |
| `openSettings()` | 打开外壳设置页 |
| `ping()` | 连通性探测 |
| `setSecret(string)` | 设置 Bridge 校验串（若外壳配置了 `bridgeSecret`） |
| `on(event, fn)` / `off(event, fn)` | 监听原生事件（如 `shellReady`） |
| `call(method, params)` | 通用调用 |

所有方法返回 `Promise`。通信格式为：

```json
{ "id": "we_...", "method": "getConfig", "params": null, "secret": "" }
```

原生回调：

```json
{ "id": "we_...", "ok": true, "data": { ... } }
```

### 与配置同步

`setFullscreen`、`setKeepScreenOn`、`setConfig` 会同步更新 `config.json`。

## 自动更新

设置 `updateUrl` 为 `http://example.com/update/` 时，外壳会请求：

`http://example.com/update/version.json`

示例：

```json
{
  "version": "1.0.3",
  "download_url": "http://example.com/update/webegg-1.0.3.apk",
  "update_log": "修复 WebView 崩溃\n优化启动速度"
}
```

规则：

1. 远程 `version` **大于**当前应用 `versionName` 时静默下载 APK
2. 下载完成后**不立刻安装**（避免打断使用）
3. **下次启动**检测到已下载包 → 弹窗询问是否立即安装
4. 用户确认后调起系统安装器（需允许「安装未知应用」）

当前应用版本见 `pubspec.yaml` 的 `version` 字段（如 `1.0.0+1`）。

## 项目结构

```
lib/
  main.dart                 # 入口
  app.dart                  # MaterialApp / 启动引导
  models/app_config.dart
  services/
    config_service.dart     # 配置读写
    log_service.dart        # 日志
    device_service.dart     # 设备信息
    update_service.dart     # 静默更新
    bridge_service.dart     # JS Bridge
  pages/
    settings_page.dart
    web_shell_page.dart
  widgets/update_prompt.dart
  theme/app_theme.dart
assets/js/bridge.js         # 注入给 Web 的 API
```

## 权限说明

- `INTERNET`：加载网页与检查更新
- `REQUEST_INSTALL_PACKAGES`：安装下载的 APK
- `WAKE_LOCK`：屏幕常亮
- 已开启明文流量（`usesCleartextTraffic`），便于内网 HTTP

## 注意事项

- 仅支持 **Android**
- 需求文档中的 `.app` 安装包在本项目对应为 **`.apk`**
- 生产环境请配置正式签名后再发布 Release 包
- Web 页面需允许被 WebView 加载；若站点有 CSP 限制 `eval`/`inline`，一般不影响本桥接注入方式

## 原始需求

见 [原始需求.md](./原始需求.md)。
