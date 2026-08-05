import type { InlineKeyboard, QQBot, ReplyTarget } from '@tencent-connect/qqbot-nodejs';
import { buildPlayKeyboard, menuIntro, type PlayPanel } from './keyboard.ts';

const FALLBACK_HINT = '\n\n（按钮暂不可用：请在开放平台开通自定义消息按钮，或直接发文字指令）';

export type PlayReplyOpts = {
  bot: QQBot;
  /** 私聊/群聊目标；按钮回调时可不带 msgId，改用 eventId */
  target: ReplyTarget;
  text: string;
  panel: PlayPanel;
  userId?: string;
  /** INTERACTION_CREATE 的 event.id，用于被动回复额度 */
  eventId?: string;
};

/**
 * 发送带小游戏按钮的文本；平台未开通自定义 keyboard 时自动回退纯文本
 */
export async function sendPlayReply(opts: PlayReplyOpts): Promise<void> {
  const { bot, target, text, panel, userId, eventId } = opts;
  const keyboard = buildPlayKeyboard(panel, userId);

  try {
    await sendWithKeyboard(bot, target, text, keyboard, eventId);
  } catch (err) {
    console.warn('[keyboard] 带按钮消息失败，回退纯文本', (err as Error).message);
    await sendPlain(bot, target, text + FALLBACK_HINT, eventId);
  }
}

export async function sendPlayMenu(
  bot: QQBot,
  target: ReplyTarget,
  panel: PlayPanel,
  userId?: string,
  eventId?: string,
): Promise<void> {
  await sendPlayReply({
    bot,
    target,
    text: menuIntro(panel),
    panel,
    userId,
    eventId,
  });
}

async function sendWithKeyboard(
  bot: QQBot,
  target: ReplyTarget,
  content: string,
  keyboard: InlineKeyboard,
  eventId?: string,
): Promise<void> {
  if (eventId) {
    await bot.send({
      target: { scope: target.scope, targetId: target.targetId },
      content,
      keyboard,
      extra: { event_id: eventId },
    });
    return;
  }
  if (target.msgId) {
    await bot.sendTextWithKeyboard(target, content, keyboard);
    return;
  }
  // 主动推送：走通用 send
  await bot.send({
    target,
    content,
    keyboard,
  });
}

async function sendPlain(
  bot: QQBot,
  target: ReplyTarget,
  content: string,
  eventId?: string,
): Promise<void> {
  if (eventId) {
    await bot.send({
      target: { scope: target.scope, targetId: target.targetId },
      content,
      extra: { event_id: eventId },
    });
    return;
  }
  await bot.sendText(target, content);
}
