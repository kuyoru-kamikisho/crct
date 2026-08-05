import type { InlineKeyboard } from '@tencent-connect/qqbot-nodejs';

/**
 * 小游戏按钮面板
 * 使用回调按钮 action.type=1，点击走 INTERACTION_CREATE（不刷屏打字）
 * 注意：自定义 keyboard 需在 QQ 开放平台开通；失败时业务侧回退纯文本
 */

export type PlayPanel = 'main' | 'farm' | 'plant' | 'plant2' | 'fish';

type KbButton = InlineKeyboard['content']['rows'][number]['buttons'][number];

/** 按钮 data 前缀：play:指令 / menu:面板 */
export const PLAY_DATA_PREFIX = 'play:';
export const MENU_DATA_PREFIX = 'menu:';

const PANELS: readonly PlayPanel[] = ['main', 'farm', 'plant', 'plant2', 'fish'];

function callbackButton(
  id: string,
  label: string,
  data: string,
  opts?: { style?: number; userId?: string },
): KbButton {
  const permission = opts?.userId
    ? { type: 0, specify_user_ids: [opts.userId] }
    : { type: 2 };

  return {
    id,
    render_data: {
      label,
      visited_label: label,
      style: opts?.style ?? 1,
    },
    action: {
      type: 1,
      permission,
      data,
      unsupport_tips: '请直接发送文字指令，如：签到 / 钓鱼 / 农场',
    } as KbButton['action'],
  };
}

function row(buttons: KbButton[]): { buttons: KbButton[] } {
  return { buttons };
}

function playData(cmd: string): string {
  return `${PLAY_DATA_PREFIX}${cmd}`;
}

function menuData(panel: PlayPanel): string {
  return `${MENU_DATA_PREFIX}${panel}`;
}

/** 按面板生成 inline keyboard（最多 5 行 × 5 钮） */
export function buildPlayKeyboard(panel: PlayPanel, userId?: string): InlineKeyboard {
  const u = userId ? { userId } : undefined;
  const b = (id: string, label: string, data: string, style?: number) =>
    callbackButton(id, label, data, { ...u, style });

  if (panel === 'fish') {
    return {
      content: {
        rows: [
          row([
            b('fish_again', '再钓一次', playData('钓鱼')),
            b('fish_sell', '卖鱼', playData('卖鱼')),
          ]),
          row([
            b('fish_book', '鱼图鉴', playData('鱼图鉴')),
            b('fish_bag', '背包', playData('背包')),
            b('fish_back', '返回', menuData('main'), 0),
          ]),
        ],
      },
    };
  }

  if (panel === 'plant') {
    return {
      content: {
        rows: [
          row([
            b('p_wheat', '小麦', playData('种植小麦')),
            b('p_potato', '土豆', playData('种植土豆')),
            b('p_carrot', '萝卜', playData('种植萝卜')),
            b('p_cabbage', '白菜', playData('种植白菜')),
            b('p_corn', '玉米', playData('种植玉米')),
          ]),
          row([
            b('p_tomato', '番茄', playData('种植番茄')),
            b('p_berry', '草莓', playData('种植草莓')),
            b('p_blue', '蓝莓', playData('种植蓝莓')),
            b('p_grape', '葡萄', playData('种植葡萄')),
          ]),
          row([
            b('p_more', '更多作物 ›', menuData('plant2')),
            b('p_back', '返回农场', menuData('farm'), 0),
          ]),
        ],
      },
    };
  }

  if (panel === 'plant2') {
    return {
      content: {
        rows: [
          row([
            b('p2_flower', '小花', playData('种花')),
            b('p2_sun', '向日葵', playData('种植向日葵')),
            b('p2_lav', '薰衣草', playData('种植薰衣草')),
          ]),
          row([
            b('p2_wood', '木灵草', playData('种植木灵草')),
            b('p2_harp', '琴音花', playData('种植琴音花')),
            b('p2_star', '星露果', playData('种植星露果')),
          ]),
          row([
            b('p2_book', '作物图鉴', playData('作物图鉴')),
            b('p2_prev', '‹ 返回', menuData('plant'), 0),
            b('p2_farm', '回农场', menuData('farm'), 0),
          ]),
        ],
      },
    };
  }

  if (panel === 'farm') {
    return {
      content: {
        rows: [
          row([
            b('f_water', '浇水', playData('浇水')),
            b('f_harvest', '收获', playData('收获')),
            b('f_plant', '去种植', menuData('plant')),
          ]),
          row([
            b('f_expand', '开荒', playData('开荒')),
            b('f_sell', '卖菜', playData('卖菜')),
            b('f_view', '刷新', playData('农场')),
          ]),
          row([
            b('f_book', '作物图鉴', playData('作物图鉴')),
            b('f_back', '返回', menuData('main'), 0),
          ]),
        ],
      },
    };
  }

  return {
    content: {
      rows: [
        row([
          b('m_in', '签到', playData('签到')),
          b('m_fish', '钓鱼', playData('钓鱼')),
          b('m_farm', '农场', playData('农场')),
        ]),
        row([
          b('m_sellf', '卖鱼', playData('卖鱼')),
          b('m_bag', '背包', playData('背包')),
          b('m_st', '状态', playData('状态')),
        ]),
        row([b('m_help', '玩法说明', playData('游戏'), 0)]),
      ],
    },
  };
}

export function menuIntro(panel: PlayPanel): string {
  if (panel === 'plant') return '第一页：粮蔬果类～点按钮下种♪';
  if (panel === 'plant2') return '第二页：花卉与特产～种贵的要更久哦';
  if (panel === 'farm') return '农场小帮手在此～点按钮操作田地吧';
  if (panel === 'fish') return '湖边微风正好，要不要再甩一竿？';
  return [
    '【木灵朵小游戏】点按钮就能玩♪',
    '也可以直接发文字：签到 / 钓鱼 / 农场 …',
  ].join('\n');
}

export function parseButtonData(
  data: string | undefined,
): { kind: 'play'; cmd: string } | { kind: 'menu'; panel: PlayPanel } | null {
  if (!data) return null;
  if (data.startsWith(PLAY_DATA_PREFIX)) {
    const cmd = data.slice(PLAY_DATA_PREFIX.length).trim();
    return cmd ? { kind: 'play', cmd } : null;
  }
  if (data.startsWith(MENU_DATA_PREFIX)) {
    const panel = data.slice(MENU_DATA_PREFIX.length).trim() as PlayPanel;
    if ((PANELS as readonly string[]).includes(panel)) {
      return { kind: 'menu', panel };
    }
  }
  return null;
}
