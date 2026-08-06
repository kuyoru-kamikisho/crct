# 坦克大战 · Battle City

复刻经典 FC《坦克大战》核心玩法的 Web 小游戏。

## 技术栈

- Vite + TypeScript（模块化）
- Canvas 2D 渲染
- SCSS 样式

## 运行

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址即可游玩。

## 操作

| 按键 | 功能 |
|------|------|
| ↑↓←→ / WASD | 移动 |
| 空格 / J | 射击 |
| P | 暂停/继续 |
| Enter | 开始 / 下一关 / 重开 |

## 胜负

- **胜利**：消灭本关全部敌方坦克（共 3 关）
- **失败**：基地被毁，或生命值归零

## 目录结构

```
src/
  main.ts
  styles/main.scss
  game/
    Game.ts          # 主循环与胜负
    constants.ts
    types.ts
    entities/Tank.ts
    map/Map.ts
    map/levels.ts
    systems/
      Input.ts
      AI.ts
      Renderer.ts
```
