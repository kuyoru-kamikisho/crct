# QQ 机器人 Demo（木灵朵）

基于官方 OpenAPI + WebSocket 的入门示例，对应仓库根目录 `aidoc.md` 中的功能清单。

## 快速开始

```bash
# 在仓库根目录
npm install
npm start
```

或：

```bash
cd demo
node index.js
```

可选环境变量：

| 变量 | 说明 |
| --- | --- |
| `QQBOT_APP_ID` | AppID |
| `QQBOT_CLIENT_SECRET` | ClientSecret |
| `DEMO_IMAGE_URL` | 回发图片的公网 URL |
| `DEMO_VOICE_URL` | 回发语音的公网 silk URL |
| `QQBOT_API_BASE` | 默认 `https://api.sgroup.qq.com` |

开放平台需开启：**群聊/单聊**、事件订阅（群与 C2C、互动、群成员），连接方式选 **WebSocket**。

## 目录

```
demo/
  index.js              # 入口
  config.js             # 配置
  lib/token.js          # AccessToken 获取与刷新
  lib/api.js            # OpenAPI 封装
  lib/gateway.js        # WebSocket 网关
  lib/store.js          # 运行时状态
  handlers/events.js    # 消息 / 互动 / 进群等业务
  handlers/scheduler.js # 每分钟改群昵称
  assets/               # 可放本地素材说明
```

## 功能对照

| 场景 | 触发 | 说明 |
| --- | --- | --- |
| 文本对话 | `你好` | 回复固定欢迎语 |
| 图片对话 | 发送图片 | 文字确认 + 回发一张图 |
| 语音 | `为我发一段语音` | 需配置 `DEMO_VOICE_URL`（silk） |
| 交互卡片 | `菜单列表` | Markdown + 按钮，点击回「您点击了按钮N」 |
| 撤回 | `撤回上一条消息` | 撤回机器人自己 2 分钟内消息 |
| 群答题 | `开始答题`，再引用回复答案 | 引用回复并 @ 用户 |
| 禁视频 | 收到视频附件 | 尝试撤回并提示（需管理员权限） |
| 违规词 | 内容含「你们是狗」 | 前两次撤回+提醒，第 3 次尝试禁言 |
| 新人 | `GROUP_MEMBER_ADD` | 尝试改名片并欢迎 |
| 机器人进群 / 被加好友 | 对应事件 | 打招呼 |
| 定时改自己昵称 | 每分钟 | `木灵朵 (HH:mm)`，接口可能未开放 |

群聊中多数消息事件为 **@机器人**（`GROUP_AT_MESSAGE_CREATE`）。若已申请全量群消息，也会处理 `GROUP_MESSAGE_CREATE`。

## 官方能力限制（实现不了会降级）

- 普通 QQ 群的**禁言 / 改群名片**在开放平台文档中几乎未正式开放，代码会尝试调用并在失败时打日志。
- 机器人通常只能撤回**自己**发送的消息；撤回他人消息需管理员且平台支持。
- 语音仅支持 **silk**；请自行准备公网可访问地址。
- 频道相关能力按需求未实现。

## 调试建议

1. 先对机器人私聊发「帮助」「你好」。
2. 拉机器人进群并设为管理员后，再测撤回视频 / 违规词。
3. 按钮需订阅 `INTERACTION`，且机器人具备消息按钮权限。
