# 多语言贡献指南

欢迎为《蓝色星原：旅谣》Wiki 工具补充语言包。

## 快速开始

1. 复制 `locales/zh-CN.js` 为 `locales/xx-YY.js`（如 `ko-KR.js`）
2. 翻译所有字符串，保持 key 结构不变
3. 在 `src/i18n/index.js` 的 `SUPPORTED_LOCALES` 与 `loaders` 中注册
4. 提交 Pull Request

## 命名约定

- 使用 BCP 47：`zh-CN` / `en-US` / `ja-JP` / `ko-KR` …
- 文件名与 locale code 一致

## 运行时注册（插件式）

```js
import { registerLocale } from '@/i18n'

registerLocale(
  'ko-KR',
  { name: 'Korean', nativeName: '한국어' },
  () => import('./locales/ko-KR').then((m) => m.default),
)
```

默认语言为简体中文；未翻译的 key 会回退到中文。
