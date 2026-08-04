const { evaluate } = require('mathjs');
const config = require('../config');
const api = require('../lib/api');
const store = require('../lib/store');

/** 招行购汇币种：英文代码 → 接口 currency 数值、中文名 */
const FX_CURRENCY = {
  USD: { code: 32, name: '美元' },
  EUR: { code: 35, name: '欧元' },
  GBP: { code: 43, name: '英镑' },
  JPY: { code: 65, name: '日元' },
  HKD: { code: 21, name: '港币' },
  CAD: { code: 39, name: '加元' },
  AUD: { code: 29, name: '澳元' },
  CHF: { code: 87, name: '瑞士法郎' },
  SGD: { code: 69, name: '新加坡元' },
  NZD: { code: 24, name: '新西兰元' },
};

const FX_PATTERN = /^(USD|EUR|GBP|JPY|HKD|CAD|AUD|CHF|SGD|NZD)\s+(\d+(?:\.\d+)?)$/i;

const SUPERSCRIPT_MAP = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

function normalizeText(content = '') {
  return String(content).replace(/\s+/g, ' ').trim();
}

/**
 * 将用户输入的各类运算符号规范化为 mathjs 可解析的表达式
 */
function normalizeMathExpression(text) {
  let expr = String(text).replace(/\s+/g, '');
  expr = expr.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_MAP[ch]);
  expr = expr.replace(/[×✕✖･·]/g, '*');
  expr = expr.replace(/÷/g, '/');
  expr = expr.replace(/π/gi, 'pi');
  expr = expr.replace(/√\(/g, 'sqrt(');
  expr = expr.replace(/√(\d+(?:\.\d+)?)/g, 'sqrt($1)');
  // 两数之间的 % 视为取模（如 100%5），单独的 50% 仍交给 mathjs 作百分号
  expr = expr.replace(/(\d+(?:\.\d+)?)%(\d+(?:\.\d+)?)/g, 'mod($1,$2)');
  return expr;
}

/** 纯计算表达式：无中英文等非表达式内容 */
function isMathExpression(text) {
  if (!text || text.length > 200) return false;
  // 允许数字、四则运算、根号、幂、百分号、圆周率、科学计数法 e/E、上标数字
  if (!/^[\d\s+\-*/×✕✖･·÷%^().,√πeE⁰¹²³⁴⁵⁶⁷⁸⁹]+$/i.test(text)) return false;
  if (!/[\d√π]/i.test(text)) return false;
  // 排除纯数字回显，需含运算符或 √ / 科学计数
  if (!/[+\-*/×✕✖･·÷%^√]|[eE][+-]?\d/.test(text)) return false;
  return true;
}

function formatCalcResult(result) {
  if (typeof result === 'number') {
    if (!Number.isFinite(result)) return String(result);
    const rounded = Math.round(result * 1e12) / 1e12;
    return String(rounded);
  }
  if (result != null && typeof result.valueOf === 'function') {
    const v = result.valueOf();
    if (typeof v === 'number' && Number.isFinite(v)) {
      return String(Math.round(v * 1e12) / 1e12);
    }
  }
  return String(result);
}

async function handleCalculator(target, text, msgId) {
  if (!isMathExpression(text)) return false;
  try {
    const expr = normalizeMathExpression(text);
    const result = evaluate(expr);
    await replyText(target, formatCalcResult(result), { msg_id: msgId });
    return true;
  } catch (err) {
    console.warn('[calc] 表达式计算失败', text, err.message);
    return false;
  }
}

function formatRmb(amount) {
  const s = amount.toFixed(4).replace(/\.?0+$/, '');
  return s || '0';
}

async function handleFxCalc(target, text, msgId) {
  const m = text.match(FX_PATTERN);
  if (!m) return false;

  const currency = m[1].toUpperCase();
  const amount = Number(m[2]);
  const meta = FX_CURRENCY[currency];
  if (!meta || !Number.isFinite(amount) || amount <= 0) return false;

  try {
    const url =
      `https://fin.paas.cmbchina.com/fininfo/api/calculator/fx-real-rate` +
      `?bsflag=buy&chflag=XH&currency=${meta.code}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.returnCode !== 'SUC0000' || data.body?.rate == null) {
      throw new Error(data.errorMsg || data.returnCode || '汇率查询失败');
    }
    const rate = Number(data.body.rate);
    // 牌价按「每 100 外币」计价：购汇人民币 = 外币金额 × 汇率 / 100
    const rmb = (amount * rate) / 100;
    await replyText(
      target,
      `${amount}${meta.name}需要支付${formatRmb(rmb)}元人民币`,
      { msg_id: msgId },
    );
    return true;
  } catch (err) {
    console.warn('[fx] 购汇计算失败', text, err.message);
    await replyText(target, '汇率查询失败，请稍后再试', { msg_id: msgId });
    return true;
  }
}

function isImageMessage(d) {
  const attachments = d.attachments || [];
  if (attachments.some((a) => /image|jpg|jpeg|png|gif|webp/i.test(a.content_type || a.filename || a.url || ''))) {
    return true;
  }
  return (d.message_type === 7 || d.content_type === 1) && attachments.length > 0;
}

function isVideoMessage(d) {
  const attachments = d.attachments || [];
  return attachments.some((a) =>
    /video|mp4/i.test(a.content_type || a.filename || a.url || ''),
  );
}

function getReplyTarget(d) {
  if (d.group_openid) {
    return { scene: 'group', id: d.group_openid, memberOpenid: d.author?.member_openid };
  }
  const userOpenid = d.author?.user_openid || d.author?.id;
  return { scene: 'c2c', id: userOpenid, memberOpenid: userOpenid };
}

async function replyText(target, text, extra = {}) {
  const payload = { msg_type: 0, content: text, ...extra };
  let result;
  if (target.scene === 'group') {
    result = await api.sendGroupMessage(target.id, payload);
  } else {
    result = await api.sendC2CMessage(target.id, payload);
  }
  store.rememberBotMessage(target.scene, target.id, result?.id);
  return result;
}

async function replyMedia(target, { fileType, url, msgId, content }) {
  let result;
  if (target.scene === 'group') {
    result = await api.sendGroupMedia(target.id, { fileType, url, msgId, content });
  } else {
    result = await api.sendC2CMedia(target.id, { fileType, url, msgId, content });
  }
  store.rememberBotMessage(target.scene, target.id, result?.id);
  return result;
}

function buildMenuKeyboard() {
  const mkBtn = (id, label) => ({
    id,
    render_data: { label, visited_label: `已点${label}`, style: 1 },
    action: {
      type: 1,
      permission: { type: 2 },
      data: id,
      unsupport_tips: '请升级 QQ 客户端',
    },
  });

  return {
    content: {
      rows: [
        {
          buttons: [
            mkBtn('btn_1', '按钮1'),
            mkBtn('btn_2', '按钮2'),
            mkBtn('btn_3', '按钮3'),
          ],
        },
      ],
    },
  };
}

async function handleHello(target, msgId) {
  return replyText(target, '你好，我是木灵朵', { msg_id: msgId });
}

async function handleImage(target, msgId) {
  await replyText(target, '收到图片，您发送了图片', { msg_id: msgId });
  if (!config.demoImageUrl) {
    return replyText(target, '未配置 DEMO_IMAGE_URL，无法回发图片', {
      msg_id: msgId,
    });
  }
  return replyMedia(target, {
    fileType: api.FILE_TYPE.image,
    url: config.demoImageUrl,
    msgId,
  });
}

async function handleVoice(target, msgId) {
  if (!config.demoVoiceUrl) {
    return replyText(
      target,
      '请设置 DEMO_VOICE_URL（silk 公网地址）后再试「为我发一段语音」',
      { msg_id: msgId },
    );
  }
  return replyMedia(target, {
    fileType: api.FILE_TYPE.voice,
    url: config.demoVoiceUrl,
    msgId,
  });
}

async function handleMenu(target, msgId) {
  const payload = {
    msg_type: 2,
    markdown: { content: '以下是菜单列表' },
    keyboard: buildMenuKeyboard(),
    msg_id: msgId,
  };
  let result;
  if (target.scene === 'group') {
    result = await api.sendGroupMessage(target.id, payload);
  } else {
    result = await api.sendC2CMessage(target.id, payload);
  }
  store.rememberBotMessage(target.scene, target.id, result?.id);
  return result;
}

async function handleRecall(target, msgId) {
  const last = store.getLastBotMessage(target.scene, target.id);
  if (!last) {
    return replyText(target, '没有可撤回的上一条机器人消息', { msg_id: msgId });
  }
  try {
    if (target.scene === 'group') {
      await api.recallGroupMessage(target.id, last.id);
    } else {
      await api.recallC2CMessage(target.id, last.id);
    }
    return replyText(target, '已撤回上一条消息', { msg_id: msgId });
  } catch (err) {
    return replyText(
      target,
      `撤回失败：${err.data?.message || err.message}（仅可撤回自己 2 分钟内消息）`,
      { msg_id: msgId },
    );
  }
}

async function handleQuizStart(target, msgId) {
  if (target.scene !== 'group') {
    return replyText(target, '答题 demo 请在群聊中使用', { msg_id: msgId });
  }
  const result = await replyText(target, config.quizQuestion, { msg_id: msgId });
  if (result?.id) store.registerQuiz(result.id, target.id);
  return result;
}

async function handleQuizAnswer(d, target) {
  const refId =
    d.message_reference?.message_id ||
    d.msg_elements?.find((e) => e.message_type === 103)?.msg_idx;

  // 群聊引用结构因客户端而异，尽量从 message_scene / 文本判断
  let quizId = refId;
  if (!quizId && d.message_scene?.ext) {
    const hit = d.message_scene.ext.find((x) => String(x).includes('ref'));
    if (hit) quizId = hit;
  }

  const text = normalizeText(d.content);
  const quiz = quizId ? store.getQuiz(quizId) : null;

  // 若拿不到引用 id，但内容像答题且刚发起过题目，也尝试匹配最近 quiz
  if (!quiz && !['2', '3'].includes(text)) return false;

  const member = target.memberOpenid;
  const mention = member ? `${api.atMember(member)} ` : '';
  const ok = text === config.quizAnswer;
  const reply = ok
    ? `恭喜 ${mention}答对正确`
    : `很遗憾 ${mention}答错了`;

  await replyText(target, reply, {
    msg_id: d.id,
    message_reference: { message_id: d.id },
  });
  return true;
}

async function handleViolation(d, target) {
  const text = normalizeText(d.content);
  const hit = config.violationWords.some((w) => text.includes(w));
  if (!hit || target.scene !== 'group') return false;

  const member = target.memberOpenid;
  try {
    await api.recallGroupMessage(target.id, d.id);
  } catch (err) {
    console.warn('[moderation] 撤回用户消息失败（通常需管理员且平台支持）', err.message);
  }

  const count = store.bumpViolation(target.id, member);
  if (count >= config.violationMuteThreshold) {
    try {
      await api.tryMuteGroupMember(target.id, member, config.muteSeconds);
      console.log(`[moderation] 已尝试禁言 ${member} ${config.muteSeconds}s`);
    } catch (err) {
      console.warn(
        '[moderation] 禁言接口不可用或无权限，仅记录违规次数=',
        count,
        err.message,
      );
    }
    return true; // 第 3 次静默
  }

  await replyText(
    target,
    `${api.atMember(member)} 你的消息违规啦~`,
    { msg_id: d.id },
  );
  return true;
}

async function handleVideoBan(d, target) {
  if (target.scene !== 'group' || !isVideoMessage(d)) return false;
  try {
    await api.recallGroupMessage(target.id, d.id);
  } catch (err) {
    console.warn('[video] 撤回视频失败', err.message);
  }
  await replyText(target, '当前群聊不可以发送视频文件喔~', { msg_id: d.id });
  return true;
}

/**
 * 处理单聊 / 群聊消息
 */
async function onMessage(d, eventId) {
  const target = getReplyTarget(d);
  if (!target.id) return;
  if (target.scene === 'group') store.trackGroup(target.id);

  if (await handleVideoBan(d, target)) return;
  if (await handleViolation(d, target)) return;
  if (await handleQuizAnswer(d, target)) return;

  if (isImageMessage(d)) {
    await handleImage(target, d.id);
    return;
  }

  const text = normalizeText(d.content);
  if (!text) return;

  if (text === '你好' || text === '您好') {
    await handleHello(target, d.id);
    return;
  }
  if (text.includes('为我发一段语音') || text === '发语音') {
    await handleVoice(target, d.id);
    return;
  }
  if (text === '菜单列表' || text === '菜单') {
    await handleMenu(target, d.id);
    return;
  }
  if (text.includes('撤回上一条消息') || text === '撤回') {
    await handleRecall(target, d.id);
    return;
  }
  if (text === '开始答题' || text.includes('出题')) {
    await handleQuizStart(target, d.id);
    return;
  }
  if (text === '帮助' || text === 'help') {
    await replyText(
      target,
      [
        '可用指令：',
        '你好 / 菜单列表 / 为我发一段语音',
        '撤回上一条消息 / 开始答题',
        '发送图片可触发图片回发',
        '计算器：直接发送表达式，如 100+20、√4、10^6',
        '购汇：币种+空格+金额，如 JPY 1000',
      ].join('\n'),
      { msg_id: d.id },
    );
    return;
  }

  // 购汇：JPY 1000
  if (await handleFxCalc(target, text, d.id)) return;
  // 计算器：纯数学表达式
  if (await handleCalculator(target, text, d.id)) return;

  // 未匹配时简单回显，方便调试
  if (text.length <= 20) {
    await replyText(target, `收到：${text}`, { msg_id: d.id || undefined, event_id: eventId });
  }
}

async function onInteraction(d, eventId) {
  const data = d.data || d;
  const btn =
    data.resolved?.button_data ||
    data.button_data ||
    data.resolved?.button_id ||
    data.button_id ||
    '';

  const labelMap = { btn_1: '按钮1', btn_2: '按钮2', btn_3: '按钮3' };
  const label = labelMap[btn] || btn || '未知按钮';

  const groupOpenid = d.group_openid || data.group_openid;
  const userOpenid = d.author?.user_openid || d.user_openid || data.user_openid;

  const content = `您点击了${label}`;
  if (groupOpenid) {
    store.trackGroup(groupOpenid);
    const result = await api.sendGroupMessage(groupOpenid, {
      msg_type: 0,
      content,
      event_id: eventId,
    });
    store.rememberBotMessage('group', groupOpenid, result?.id);
  } else if (userOpenid) {
    const result = await api.sendC2CMessage(userOpenid, {
      msg_type: 0,
      content,
      event_id: eventId,
    });
    store.rememberBotMessage('c2c', userOpenid, result?.id);
  }
}

async function onGroupAddRobot(d, eventId) {
  const groupOpenid = d.group_openid;
  if (!groupOpenid) return;
  store.trackGroup(groupOpenid);
  const result = await api.sendGroupMessage(groupOpenid, {
    msg_type: 0,
    content: `大家好，我是 ${config.botNickBase}，很高兴加入本群！发送「帮助」查看指令。`,
    event_id: eventId,
  });
  store.rememberBotMessage('group', groupOpenid, result?.id);
}

async function onFriendAdd(d, eventId) {
  const userOpenid = d.openid || d.user_openid || d.author?.user_openid;
  if (!userOpenid) return;
  const result = await api.sendC2CMessage(userOpenid, {
    msg_type: 0,
    content: `你好，我是 ${config.botNickBase}，很高兴认识你！发送「帮助」查看指令。`,
    event_id: eventId,
  });
  store.rememberBotMessage('c2c', userOpenid, result?.id);
}

async function onGroupMemberAdd(d, eventId) {
  const groupOpenid = d.group_openid;
  const memberOpenid = d.op_member_openid || d.member_openid || d.author?.member_openid;
  if (!groupOpenid || !memberOpenid) return;
  store.trackGroup(groupOpenid);

  try {
    await api.trySetMemberNick(groupOpenid, memberOpenid, '我是新人');
  } catch (err) {
    console.warn('[nick] 修改群名片暂不可用', err.message);
  }

  const result = await api.sendGroupMessage(groupOpenid, {
    msg_type: 0,
    content: `欢迎 ${api.atMember(memberOpenid)} 加入群聊喔~`,
    event_id: eventId,
  });
  store.rememberBotMessage('group', groupOpenid, result?.id);
}

module.exports = {
  onMessage,
  onInteraction,
  onGroupAddRobot,
  onFriendAdd,
  onGroupMemberAdd,
};
