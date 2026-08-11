# 蓝色星原：旅谣 Wiki 工具

《蓝色星原：旅谣》（Azur Promilia）非官方纯静态 Wiki 工具。  
技术栈：Vue 3 · Vite · Pinia · Vue Router · SCSS · vue-i18n

情报结构参考 [BWiki 蓝色星原：旅谣](https://wiki.biligame.com/ap/%E9%A6%96%E9%A1%B5)，界面样式为独立设计。

## 功能

- 顶部栏：语言 / 主题 / 自定义指针颜色
- 左侧导航：图鉴、攻略、剧情、小游戏、贡献
- 角色 / 奇波图鉴（示例数据，可扩展）
- 空心·实心交错三角形鼠标指针（拖尾、静止渐隐、多键点击反馈）
- 偏好本地缓存（localStorage），可完全离线运行
- 多语言：中文（默认）/ 英文 / 日文，见 `src/i18n/README.md`

## 开发

```sh
npm install
npm run dev
```

```sh
npm run build
npm run preview
```

构建产物为静态文件，可用任意静态服务器或 GitHub Pages 托管（hash 路由）。

## 正文字体

选用 **Noto Sans SC（思源黑体）**，SIL OFL 1.1 可免费商用。  
默认使用系统字体回退以优化首屏；自托管方式见 `public/fonts/README.md`。

## 目录要点

```
src/
  components/   # 布局与通用组件
  cursor/       # 自定义鼠标指针
  data/         # 图鉴等静态数据
  i18n/         # 多语言
  stores/       # Pinia（设置与本地缓存）
  views/        # 页面（路由懒加载）
```
