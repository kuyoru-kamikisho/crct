# I Wanna · 菲比啾比

浏览器端 2D 硬核横版平台跳跃游戏，对标 *I Wanna Be The Guy* 手感，界面质感参考 iWanna 菲比啾比。

## 运行

```bash
npm install
npm run dev
```

浏览器打开提示的本地地址即可游玩（默认 `http://localhost:5173`）。

## 操作

| 按键 | 作用 |
|------|------|
| A / D 或 ← / → | 左右移动 |
| Space / W / ↑ / Z | 跳跃（支持二段跳） |
| X / J | 射击 |
| R | 快速重置到存档点 |
| Esc / P | 暂停 |

## 机制

- 触碰银刺 / 敌人立刻 Game Over，可快速重置
- 黄黑渐变传送门跨层瞬移
- 绿色存档点、星星道具、法杖暂时关闭尖刺
- 三关递进难度，终点通关

## 技术

纯前端：Vite + React + TypeScript + Canvas 2D + framer-motion，无后端。
