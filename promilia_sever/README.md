# Promilia Wiki 服务

Python 3.9+ 标准库即可运行，不用装数据库，也不用 `pip install`。

同一进程提供：

- 角色投票（`data/votes.db`）
- 站内搜索 / 导航索引（`data/search.db`，独立文件，不与投票库共用）

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
3. 打开 Wiki：顶栏搜索走 `/wiki-api`，侧栏「小游戏 → 角色排名」走 `/vote-api`

开发环境会把前端的 `/vote-api`、`/wiki-api` 都代理到本服务。生产环境把这两个前缀反代到 `8787` 即可。

## 数据

| 文件 | 用途 |
| --- | --- |
| `data/votes.db` | 投票记录。删掉等于清空票数。 |
| `data/search.db` | 站内搜索文档、物品获取途径导航、图鉴摘要。启动时扫描 `promilia_tools/src/data` 重建。 |

首次启动会给投票库补一周演示票（每个角色每天 0～10 票，已有记录不会被覆盖），方便看折线趋势。

角色 / 奇波 / 物品文件变更后，服务会在下次搜索请求时按需重建 `search.db`（约 15 秒检查一次）。重启服务也会强制重建。

健康检查：<http://127.0.0.1:8787/api/health>

搜索示例：<http://127.0.0.1:8787/api/search?q=%E6%9C%AB%E9%9F%B3>

导航目录：<http://127.0.0.1:8787/api/nav>
