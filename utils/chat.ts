import { EnumText, pickReply, type EnumTextKey } from './enum_text.ts';

/** 基础闲聊意图（按 priority 从高到低匹配，先命中先生效） */
export type ChatRule = {
  intent: EnumTextKey;
  /** 越大越优先；更具体的场景应更高 */
  priority: number;
  /** 任一关键词/正则命中即匹配（关键词为包含匹配） */
  patterns: readonly (string | RegExp)[];
};

/**
 * 规则表：覆盖打招呼、身份、能力、情绪互动等常见场景
 * 注意：纯计算 / 购汇由 main 里其它分支处理，不走这里
 */
export const CHAT_RULES: readonly ChatRule[] = [
  // 时段问候（优先于泛问候）
  {
    intent: 'greetMorning',
    priority: 100,
    patterns: ['早上好', '早安', '早呀', '早啊', 'good morning'],
  },
  {
    intent: 'greetAfternoon',
    priority: 100,
    patterns: ['下午好', '午安', '中午好', 'good afternoon'],
  },
  {
    intent: 'greetEvening',
    priority: 100,
    patterns: ['晚上好', '傍晚好', 'good evening'],
  },
  {
    intent: 'greetNight',
    priority: 100,
    patterns: ['晚安', '晚安安', 'good night', 'goodnight'],
  },

  // 帮助 / 能力（优先于「你是谁」类宽匹配）
  {
    intent: 'help',
    priority: 95,
    patterns: ['帮助', '怎么用', '使用说明', '菜单', '/help', 'help'],
  },
  {
    intent: 'whatCanIDo',
    priority: 94,
    patterns: [
      '你能干什么',
      '你会干什么',
      '你会做什么',
      '你能做什么',
      '有什么功能',
      '功能介绍',
      '你会啥',
      '能做什么',
      '可以做什么',
      '能干嘛',
      '会干嘛',
    ],
  },

  // 身份
  {
    intent: 'whoAmI',
    priority: 90,
    patterns: [
      '你是谁',
      '你是什么',
      '你叫什么名字',
      '自我介绍',
      '介绍一下自己',
      '介绍下自己',
      'who are you',
      '你谁啊',
      '你谁呀',
    ],
  },
  {
    intent: 'nameAsk',
    priority: 88,
    patterns: ['叫你什么', '怎么称呼你', '你的名字', '名字是什么', '怎么叫你'],
  },
  {
    intent: 'aboutAppearance',
    priority: 86,
    patterns: ['你长什么样', '你什么样子', '你多高', '你身高', '花蕊', '竖琴'],
  },
  {
    intent: 'aboutElement',
    priority: 86,
    patterns: ['什么元素', '木元素', '什么属性', '技能', '你会什么招'],
  },
  {
    intent: 'aboutOrigin',
    priority: 86,
    patterns: ['你从哪来', '哪里来的', '蓝色星原', '旅谣', '家在哪', '你的家乡'],
  },
  {
    intent: 'aboutAge',
    priority: 86,
    patterns: ['你几岁', '多大了', '年龄', '多少岁'],
  },
  {
    intent: 'areYouBot',
    priority: 85,
    patterns: ['你是机器人', '你是ai', '你是AI', '是不是机器人', '是bot吗', '人工智能'],
  },
  {
    intent: 'whoIsMaster',
    priority: 85,
    patterns: ['你的主人', '谁是你主人', '听谁的', '你老板'],
  },

  // 社交礼仪
  {
    intent: 'bye',
    priority: 80,
    patterns: ['再见', '拜拜', '拜拜啦', '回见', '下次见', '我走了', 'bye', 'goodbye', '回见啦'],
  },
  {
    intent: 'thanks',
    priority: 80,
    patterns: ['谢谢', '感谢', '多谢', '谢谢你', 'thanks', 'thank you', '3q', '多谢啦'],
  },
  {
    intent: 'sorry',
    priority: 80,
    patterns: ['对不起', '抱歉', '不好意思', '我错了', 'sorry'],
  },
  {
    intent: 'welcomeBack',
    priority: 80,
    patterns: ['我回来了', '回来啦', '我回来啦'],
  },

  // 情绪 / 状态
  {
    intent: 'praise',
    priority: 75,
    patterns: ['真棒', '厉害', '好聪明', '好厉害', '棒棒', '优秀', '给你点赞', '真厉害'],
  },
  {
    intent: 'love',
    priority: 75,
    patterns: ['喜欢你', '爱你', '我爱你', '喜欢木灵朵', 'love you'],
  },
  {
    intent: 'comfort',
    priority: 75,
    patterns: ['好难过', '好伤心', '想哭', '安慰我', '心情不好', '不开心', '郁闷', '崩溃'],
  },
  {
    intent: 'bored',
    priority: 75,
    patterns: ['好无聊', '好闲', '没事干', '陪我玩', '好闷'],
  },
  {
    intent: 'busy',
    priority: 75,
    patterns: ['我在忙', '我很忙', '先忙了', '去忙了'],
  },
  {
    intent: 'hungry',
    priority: 75,
    patterns: ['好饿', '饿了', '吃饭了吗', '吃了吗', '好想吃饭'],
  },
  {
    intent: 'sleepy',
    priority: 75,
    patterns: ['好困', '困了', '想睡觉', '睡了'],
  },
  {
    intent: 'weatherGood',
    priority: 70,
    patterns: ['天气真好', '好天气', '今天天气不错', '出太阳了'],
  },
  {
    intent: 'weatherBad',
    priority: 70,
    patterns: ['下雨了', '好冷', '好热', '天气不好', '打雷了'],
  },

  // 角色互动
  {
    intent: 'pat',
    priority: 70,
    patterns: ['摸摸', '摸头', 'rua', '揉揉', '摸摸头'],
  },
  {
    intent: 'hug',
    priority: 70,
    patterns: ['抱抱', '抱一下', '给我抱抱', '抱我'],
  },
  {
    intent: 'sing',
    priority: 70,
    patterns: ['唱歌', '唱首歌', '弹一首', '弹琴', '来首曲子', '听你弹琴'],
  },
  {
    intent: 'dance',
    priority: 70,
    patterns: ['跳舞', '跳个舞', '来段舞'],
  },
  {
    intent: 'cute',
    priority: 70,
    patterns: ['好可爱', '好萌', '好可爱啊', '太可爱了', '你好可爱', '好可爱哦'],
  },
  {
    intent: 'eatYou',
    priority: 70,
    patterns: ['吃掉你', '把你吃了', '好吃吗'],
  },

  // 负面
  {
    intent: 'scold',
    priority: 65,
    patterns: ['笨蛋', '坏蛋', '去死', '可恶', '讨厌死了'],
  },
  {
    intent: 'hate',
    priority: 65,
    patterns: ['讨厌你', '恨你', '不想理你'],
  },
  {
    intent: 'dumb',
    priority: 65,
    patterns: ['你好蠢', '你好笨', '好笨啊', '真笨', '大笨蛋'],
  },

  // 仅叫名字（整句近似等于称呼时才当打招呼，避免「木灵朵帮我…」误触）
  {
    intent: 'greet',
    priority: 55,
    patterns: [/^[\s]*([嘿哈啊哦嗯～~！!。.]*)?(木灵朵|朵朵)([嘿哈啊哦嗯～~！!。. ]*)?$/],
  },

  // 泛打招呼（优先级最低，避免吞掉更具体意图）
  {
    intent: 'greet',
    priority: 50,
    patterns: [
      '你好',
      '您好',
      '嗨',
      '哈喽',
      '哈啰',
      'hello',
      'hi',
      'hey',
      '在吗',
      '在不在',
      '你好呀',
      '你好啊',
      '你好哟',
    ],
  },
];

const SORTED_RULES = [...CHAT_RULES].sort((a, b) => b.priority - a.priority);

/**
 * 去掉 QQ 机器人常见噪声：@提及、多余空白
 */
export function normalizeChatText(raw: string): string {
  return String(raw)
    .replace(/<@!?\d+>/g, '')
    .replace(/＠\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function patternHit(text: string, lower: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    const p = pattern.toLowerCase();
    // 短英文词用词边界，避免 hi 误伤 this；中文用包含
    if (/^[a-z0-9 /]+$/i.test(pattern)) {
      return new RegExp(`(?:^|\\s|[\\p{P}\\p{S}])${escapeReg(p)}(?:$|\\s|[\\p{P}\\p{S}])`, 'iu').test(
        lower,
      ) || lower === p;
    }
    return text.includes(pattern) || lower.includes(p);
  }
  return pattern.test(text) || pattern.test(lower);
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type ChatMatch = {
  matched: true;
  intent: EnumTextKey;
  reply: string;
};

export type ChatNoMatch = {
  matched: false;
};

/**
 * 匹配基础闲聊意图并生成回复
 */
export function matchChat(raw: string): ChatMatch | ChatNoMatch {
  const text = normalizeChatText(raw);
  if (!text) return { matched: false };

  const lower = text.toLowerCase();

  for (const rule of SORTED_RULES) {
    for (const pattern of rule.patterns) {
      if (patternHit(text, lower, pattern)) {
        const pool = EnumText[rule.intent];
        return {
          matched: true,
          intent: rule.intent,
          reply: pickReply(pool),
        };
      }
    }
  }

  return { matched: false };
}
