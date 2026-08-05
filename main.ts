import { QQBot, type InteractionEvent, type ReplyTarget } from "@tencent-connect/qqbot-nodejs";
import SensitiveWordTool from "sensitive-word-tool";
import { calculateExpression, calculateFx, matchChat, matchPlay, pickReply } from "./utils/index.ts";
import { EnumText } from "./utils/enum_text.ts";
import { parseButtonData } from "./utils/keyboard.ts";
import { sendPlayMenu, sendPlayReply } from "./utils/reply.ts";

/** 基于 DFA，启用内置中文默认词库；可用 addWords 追加自定义词 */
const sensitive = new SensitiveWordTool({ useDefaultWords: true });

const bot = new QQBot({
    appId: '1905345176',
    appSecret: 'gLsFQQBftsiKhpiL',
    logger: console,
});

function interactionTarget(event: InteractionEvent): { userId: string; target: ReplyTarget } | null {
    if (event.group_openid) {
        const userId = event.group_member_openid || event.data?.resolved?.user_id;
        if (!userId) return null;
        return {
            userId,
            target: { scope: 'group', targetId: event.group_openid },
        };
    }
    const userId = event.user_openid || event.data?.resolved?.user_id;
    if (!userId) return null;
    return {
        userId,
        target: { scope: 'c2c', targetId: userId },
    };
}

bot.on("message", async (ctx, msg) => {
    // ctx — Koa-style MiddlewareContext，携带 middleware 注入的数据
    msg.content = msg.content.trim();

    // verify=true 表示文本中出现了敏感词
    if (sensitive.verify(msg.content)) {
        await bot.sendText(msg.replyTarget, EnumText.forbidden);
        return;
    }

    // 签到 / 钓鱼 / 农场等（附带按钮面板，点按无需再打字）
    const play = matchPlay(msg.senderId, msg.content);
    if (play.matched) {
        await sendPlayReply({
            bot,
            target: msg.replyTarget,
            text: play.reply,
            panel: play.panel,
            userId: msg.senderId,
        });
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

/** 按钮回调：先 ACK，再执行玩法并回带新按钮 */
bot.on("interaction", async (_ctx, event) => {
    try {
        await bot.acknowledgeInteraction(event.id, 0);
    } catch (err) {
        console.warn('[interaction] ACK 失败', (err as Error).message);
    }

    const parsed = parseButtonData(event.data?.resolved?.button_data);
    if (!parsed) return;

    const ctxTarget = interactionTarget(event);
    if (!ctxTarget) {
        console.warn('[interaction] 无法解析用户/会话', event.id);
        return;
    }

    const { userId, target } = ctxTarget;

    try {
        if (parsed.kind === 'menu') {
            await sendPlayMenu(bot, target, parsed.panel, userId, event.id);
            return;
        }

        const play = matchPlay(userId, parsed.cmd);
        if (!play.matched) {
            await sendPlayMenu(bot, target, 'main', userId, event.id);
            return;
        }

        await sendPlayReply({
            bot,
            target,
            text: play.reply,
            panel: play.panel,
            userId,
            eventId: event.id,
        });
    } catch (err) {
        console.warn('[interaction] 处理失败', (err as Error).message);
    }
});

await bot.start();
