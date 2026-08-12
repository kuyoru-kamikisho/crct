# Cursor Atelier · 鼠标特效工坊

用于开发、预览和复用各种「会动」的鼠标指针特效。每个指针都是**独立 JS 文件**，任意前端项目引入对应文件后，通过统一 API 即可开关。

## 快速预览

用本地静态服务打开 `index.html` 即可（直接 `file://` 也能用）：

```bash
# 任选一种
npx serve .
python -m http.server 5173
```

页面左侧按风格筛选并切换指针，右侧试炼场可测试移动 / 悬停静止 / 点击互动。

## 目录结构

```
mouse_effect/
├── index.html              # 测试台
├── css/style.css
├── js/app.js               # 仅测试页切换逻辑
└── js/cursors/             # 每个指针一个独立模块
    ├── snowflake.js
    ├── crosshair.js
    ├── bubble.js
    └── ...
```

## 在你的项目中使用

只需引入需要的那一个文件：

```html
<script src="path/to/js/cursors/snowflake.js"></script>
<script>
  // 启用
  MouseCursorSnowflake.enable();

  // 关闭
  MouseCursorSnowflake.disable();

  // 切换
  MouseCursorSnowflake.toggle();

  // 查询
  MouseCursorSnowflake.isEnabled();

  // 销毁（同 disable）
  MouseCursorSnowflake.destroy();
</script>
```

部分模块支持额外参数或方法，例如雪花：

```js
MouseCursorSnowflake.enable({ color: '#e8f6ff', idleMs: 800, maxFlakes: 32 });
MouseCursorSnowflake.burst(x, y); // 手动触发小范围炸开
```

## 统一 API

每个指针模块挂载到 `window` 上，命名形如 `MouseCursorXxx`，均提供：

| 方法 | 说明 |
|------|------|
| `enable(options?)` | 启用指针效果 |
| `disable()` | 关闭并清理画布 / 监听 |
| `toggle(options?)` | 开 / 关切换 |
| `isEnabled()` | 是否已启用 |
| `destroy()` | 销毁（等同 disable） |

同一时间建议只启用一个指针模块。

## 指针一览（26 款）

| 模块 | 全局名 | 风格 | 互动亮点 |
|------|--------|------|----------|
| `snowflake.js` | `MouseCursorSnowflake` | 自然 | 静止渐隐、点击炸开 |
| `crosshair.js` | `MouseCursorCrosshair` | 游戏 | 旋转准星、后坐力 |
| `bubble.js` | `MouseCursorBubble` | 可爱 | 气泡漂浮、点击冒泡 |
| `hollow-square.js` | `MouseCursorHollowSquare` | 极简 | 多层旋转方框 |
| `triangle.js` | `MouseCursorTriangle` | 几何 | 空实心交错三角 |
| `flower.js` | `MouseCursorFlower` | 可爱 | 旋转小花、静止渐隐 |
| `neon-trail.js` | `MouseCursorNeonTrail` | 科幻 | 霓虹拖尾 |
| `hologram.js` | `MouseCursorHologram` | 科幻 | 全息轨道与扫描线 |
| `magic-spark.js` | `MouseCursorMagicSpark` | 游戏 | 魔法星芒 |
| `pixel.js` | `MouseCursorPixel` | 游戏 | 复古像素碎裂 |
| `heart.js` | `MouseCursorHeart` | 可爱 | 心跳爱心拖尾 |
| `paw.js` | `MouseCursorPaw` | 可爱 | 猫爪印路径 |
| `blood.js` | `MouseCursorBlood` | 恐怖 | 血滴与溅射 |
| `ghost.js` | `MouseCursorGhost` | 恐怖 | 幽灵延迟跟随 |
| `eye.js` | `MouseCursorEye` | 恐怖 | 邪眼眨眼凝视 |
| `fire.js` | `MouseCursorFire` | 元素 | 烈焰粒子 |
| `lightning.js` | `MouseCursorLightning` | 元素 | 闪电弧光 |
| `butterfly.js` | `MouseCursorButterfly` | 自然 | 振翅与彩粉 |
| `comet.js` | `MouseCursorComet` | 宇宙 | 彗星拖尾 |
| `glitch.js` | `MouseCursorGlitch` | 科幻 | RGB 故障抖动 |
| `galaxy.js` | `MouseCursorGalaxy` | 宇宙 | 星系螺旋 |
| `ink.js` | `MouseCursorInk` | 艺术 | 墨渍泼溅 |
| `smoke.js` | `MouseCursorSmoke` | 氛围 | 烟尘缭绕 |
| `rainbow-star.js` | `MouseCursorRainbowStar` | 可爱 | 彩虹星环绕 |
| `gear.js` | `MouseCursorGear` | 蒸汽朋克 | 双齿轮咬合 |
| `blue-archive.js` | `MouseCursorBlueArchive` | 游戏 | 碧蓝档案触摸指针：扩散圆盘、旋转弧环、碎片与拖尾 |

## 设计约定

- **不静止**：指针主体或附属粒子始终有动画；若干款在鼠标静止一段时间后会渐隐。
- **可互动**：移动产生跟随 / 拖尾；点击触发小范围爆发（避免铺满全屏）。
- **可插拔**：不依赖构建工具，原生 `<script>` 引入即可。
- **可清理**：`disable()` 会移除 canvas、事件监听，并恢复系统光标。

## 扩展新指针

1. 在 `js/cursors/` 新建 `your-style.js`，按现有文件结构实现 canvas 动画。
2. 导出 `window.MouseCursorYourStyle = { enable, disable, toggle, isEnabled, destroy }`。
3. 在 `index.html` 引入脚本，并在 `js/app.js` 的 `CATALOG` 中登记一项。

## 原始需求

在当前项目创建一个前端项目，该项目的用途如下：

在一些网站中很多人喜欢花里胡哨的鼠标指针样式，本项目就是用于开发各种各样的鼠标样式并进行测试的。

需要的鼠标指针样式有以下：
- 雪花型
- 枪械瞄准准星型
- 气泡型
- 空心方格型
- 空实心交错三角型
- 萌系小花型

我目前只想到了这几个样式，帮我尽可能多的想更多花里胡哨的指针样式。

任何形式的指针都不能是静止不动的，那样的指针回显的非常的单调，比如雪花型指针在鼠标悬浮不动一段时间后应当渐变消失，即屏幕上不再有雪花效果，鼠标移动时则再次跟随指针出现雪花飘落效果，左右键点击时则让雪花像炸开一样（但是炸开范围不能太大）；
准星型可以让准星一直旋转之类的，总之任何形式的指针样式都应该附带额外的互动效果和跟随效果尽可能地好看漂亮。

开发说明：每个样式的鼠标指针都应该互相独立的开发成单独的js文件，任何前端项目只需要引入对应的js文件就可以实现对应的指针样式（但是注意每个js要开放一个api以便于让用户决定是否启用此鼠标样式和在合适的时机触发），index.html主要是用于测试这几个指针，有几个指针样式就应该放几个按钮，点击按钮可以切换鼠标指针样式

开发时整体要布局、交互优美，指针款式尽可能地多，有各类风格：科幻、游戏、可爱、恐怖....要尽可能地能迎合各类人群；
最后，在保证特效好看的前提下，提高指针样式的性能，美观优先，性能次之。