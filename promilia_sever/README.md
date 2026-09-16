# 角色投票服务

Python 3.9+ 标准库即可运行，不用装数据库，也不用 `pip install`。

## 启动

```bash
cd promilia_sever
python app.py
```

默认监听 `http://127.0.0.1:8787`。

换地址或端口：

```bash
python app.py --host 0.0.0.0 --port 8787
```

停掉：终端里 `Ctrl+C`。

## 和前端一起用

1. 先启动本服务
2. 再在 `promilia_tools` 里执行 `yarn dev`
3. 打开 Wiki 侧栏「小游戏 → 角色排名」

开发环境会把前端的 `/vote-api` 代理到本服务。生产环境把 `/vote-api/` 反代到 `8787` 即可。

## 数据

投票记录保存在 `data/votes.db`（SQLite）。删掉这个文件等于清空票数。

首次启动会补一周演示票（每个角色每天 0～10 票，已有记录不会被覆盖），方便看折线趋势。

角色名单自动读取 `promilia_tools/src/data/characters/`，加角色文件后不用改本服务。

健康检查：<http://127.0.0.1:8787/api/health>
