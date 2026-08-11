# 字体文件（可选）

将 [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC)（SIL OFL 1.1）的 woff2 放到此目录：

- `NotoSansSC-Regular.woff2`
- `NotoSansSC-Medium.woff2`
- `NotoSansSC-Bold.woff2`

然后取消 `src/assets/styles/fonts.scss` 中 `@font-face` 的注释即可离线自托管。

未放置字体时，会自动使用系统中文字体（苹方 / 微软雅黑等）。
