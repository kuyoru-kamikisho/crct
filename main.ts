import { QQBot } from "@tencent-connect/qqbot-nodejs";
import { calculateExpression, calculateFx } from "./utils/index.ts";
import { EnumText } from "./utils/enum_text.js";

const bot = new QQBot({
    appId: '1905345176',
    appSecret: 'gLsFQQBftsiKhpiL',
    logger: console,
});

bot.on("message", async (ctx, msg) => {
    // ctx — Koa-style MiddlewareContext，携带 middleware 注入的数据
    msg.content = msg.content.trim();
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

    await bot.sendText(msg.replyTarget, EnumText.unknown);
});

await bot.start();