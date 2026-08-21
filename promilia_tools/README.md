> **声明：** 本项目仅供个人学习与交流使用，不用于任何商业目的。内容如有侵权，请联系本仓库所有者，将尽快修改或删除相关内容。

# 蓝色星原：旅谣 Wiki 工具

《蓝色星原：旅谣》（Azur Promilia）非官方纯静态 Wiki 工具。  
技术栈：Vue 3 · Vite · Pinia · Vue Router · SCSS · vue-i18n

数据来源参考 [BWiki 蓝色星原：旅谣](https://wiki.biligame.com/ap/%E9%A6%96%E9%A1%B5)，界面样式为AI独立设计。

## 功能

- 顶部栏：语言 / 主题 / 自定义指针颜色
- 左侧导航：图鉴、攻略、剧情、小游戏、贡献
- 角色 / 奇波 / 物品图鉴（可由 BWiki 爬虫同步）
- 空心·实心交错三角形鼠标指针（拖尾、静止渐隐、多键点击反馈）
- 偏好本地缓存（localStorage），可完全离线运行
- 多语言：中文（默认）/ 英文 / 日文，见 `src/i18n/README.md`

## 开发

```sh
npm install
npm run dev
```

```sh
npm run spider:qibo
npm run spider:items
```

```sh
npm run build
npm run preview
```

构建产物为静态文件，可用任意静态服务器或 GitHub Pages 托管。

为了让搜索引擎收录干净的 URL（而不是 `#/path`），站点使用 **History 路由**。静态托管需要 SPA fallback：

- GitHub Pages：构建会生成 `404.html`，未知路径会回退到前端路由
- Nginx：`try_files $uri $uri.html $uri/ /index.html;`
- 旧的 hash 链接（`/#/encyclopedia/characters`）进入站点后会自动改写为 history 路径

## SEO

构建时会为首页、角色图鉴、每个角色详情、奇波图鉴、物品图鉴与获取途径分类、贡献页等生成独立 HTML（含 title、description、canonical、Open Graph、JSON-LD 与 noscript 正文），并写出 `sitemap.xml`、`robots.txt`。

请在 `.env.production` 或 `.env` 中设置线上地址，以便 sitemap / Open Graph 使用绝对 URL：

```sh
VITE_SITE_URL=https://your-domain.example
```

也可修改 `src/seo/site.js` 中的 `CONFIGURED_SITE_URL`。若部署在 GitHub Pages 子路径，请同时设置 Vite `base`，例如 `base: '/repo/'`。

建设中的占位栏目会预渲染但标记 `noindex`，避免薄内容进入索引。

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
    seo/          # 站点 SEO 配置与 meta 生成
    stores/       # Pinia（设置与本地缓存）
    views/        # 页面（路由懒加载）
```
