import { QQBot } from "@tencent-connect/qqbot-nodejs";
import SensitiveWordTool from "sensitive-word-tool";
import { calculateExpression, calculateFx, matchChat, matchPlay, pickReply } from "./utils/index.ts";
import { EnumText } from "./utils/enum_text.ts";

/** 基于 DFA，启用内置中文默认词库；可用 addWords 追加自定义词 */
const sensitive = new SensitiveWordTool({ useDefaultWords: true });

const bot = new QQBot({
    appId: '1905345176',
    appSecret: 'gLsFQQBftsiKhpiL',
    logger: console,
});

bot.on("message", async (ctx, msg) => {
    // ctx — Koa-style MiddlewareContext，携带 middleware 注入的数据
    msg.content = msg.content.trim();

    // verify=true 表示文本中出现了敏感词
    if (sensitive.verify(msg.content)) {
        await bot.sendText(msg.replyTarget, EnumText.forbidden);
        return;
    }

    // 签到 / 钓鱼 / 农场等（简易文件记忆，按用户落盘）
    const play = matchPlay(msg.senderId, msg.content);
    if (play.matched) {
        await bot.sendText(msg.replyTarget, play.reply);
        return;
    }

    // 基础闲聊：你好 / 你是谁 / 你能干什么 等（固定文案见 enum_text）
    const chat = matchChat(msg.content);
    if (chat.matched) {
        await bot.sendText(msg.replyTarget, chat.reply);
        return;
    }

    const calc = calculateExpression(msg.content);
    if (calc != null) {
        await bot.sendText(msg.replyTarget, msg.content + '=' + calc);
        return;
    }

    const fx = await calculateFx(msg.content);
    if (fx.matched) {
        await bot.sendText(msg.replyTarget, fx.message);
        return;
    }

    await bot.sendText(msg.replyTarget, pickReply(EnumText.unknown));
});

await bot.start();