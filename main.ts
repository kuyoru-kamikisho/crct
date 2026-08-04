import { QQBot } from "@tencent-connect/qqbot-nodejs";
import SensitiveWordTool from "sensitive-word-tool";
import { calculateExpression, calculateFx } from "./utils/index.ts";
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