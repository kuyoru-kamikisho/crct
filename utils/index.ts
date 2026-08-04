import { evaluate } from 'mathjs';

export { EnumText, pickReply } from './enum_text.ts';
export type { EnumTextKey, ReplyPool } from './enum_text.ts';
export { matchChat, normalizeChatText, CHAT_RULES } from './chat.ts';
export type { ChatMatch, ChatNoMatch, ChatRule } from './chat.ts';
export { loadUser, saveUser, updateUser, defaultUserMemory } from './memory.ts';
export type { UserMemory, FarmPlot, CheckinState } from './memory.ts';
export { matchPlay } from './play.ts';
export type { PlayMatch, PlayNoMatch } from './play.ts';

/** 招行购汇币种：英文代码 → 接口 currency 数值、中文名 */
export const FX_CURRENCY: Record<string, { code: number; name: string }> = {
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

export const FX_PATTERN =
  /^(USD|EUR|GBP|JPY|HKD|CAD|AUD|CHF|SGD|NZD)\s+(\d+(?:\.\d+)?)$/i;

export const SUPERSCRIPT_MAP: Record<string, string> = {
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

/**
 * 将用户输入的各类运算符号规范化为 mathjs 可解析的表达式
 */
export function normalizeMathExpression(text: string): string {
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
export function isMathExpression(text: string): boolean {
  if (!text || text.length > 200) return false;
  // 允许数字、四则运算、根号、幂、百分号、圆周率、科学计数法 e/E、上标数字
  if (!/^[\d\s+\-*/×✕✖･·÷%^().,√πeE⁰¹²³⁴⁵⁶⁷⁸⁹]+$/i.test(text)) return false;
  if (!/[\d√π]/i.test(text)) return false;
  // 排除纯数字回显，需含运算符或 √ / 科学计数
  if (!/[+\-*/×✕✖･·÷%^√]|[eE][+-]?\d/.test(text)) return false;
  return true;
}

export function formatCalcResult(result: unknown): string {
  if (typeof result === 'number') {
    if (!Number.isFinite(result)) return String(result);
    const rounded = Math.round(result * 1e12) / 1e12;
    return String(rounded);
  }
  if (result != null && typeof (result as { valueOf?: () => unknown }).valueOf === 'function') {
    const v = (result as { valueOf: () => unknown }).valueOf();
    if (typeof v === 'number' && Number.isFinite(v)) {
      return String(Math.round(v * 1e12) / 1e12);
    }
  }
  return String(result);
}

/**
 * 计算器：解析并计算纯数学表达式
 * @returns 计算结果字符串；非表达式或计算失败时返回 null
 */
export function calculateExpression(text: string): string | null {
  if (!isMathExpression(text)) return null;
  try {
    const expr = normalizeMathExpression(text);
    const result = evaluate(expr);
    return formatCalcResult(result);
  } catch (err) {
    console.warn('[calc] 表达式计算失败', text, (err as Error).message);
    return null;
  }
}

export function formatRmb(amount: number): string {
  const s = amount.toFixed(4).replace(/\.?0+$/, '');
  return s || '0';
}

export type FxCalcSuccess = {
  matched: true;
  ok: true;
  currency: string;
  amount: number;
  rate: number;
  rmb: number;
  message: string;
};

export type FxCalcFail = {
  matched: true;
  ok: false;
  message: string;
};

export type FxCalcNoMatch = {
  matched: false;
};

/**
 * 购汇计算：解析「币种 金额」并查询招行实时牌价
 * 牌价按「每 100 外币」计价：购汇人民币 = 外币金额 × 汇率 / 100
 */
export async function calculateFx(
  text: string,
): Promise<FxCalcSuccess | FxCalcFail | FxCalcNoMatch> {
  const m = text.match(FX_PATTERN);
  if (!m) return { matched: false };

  const currency = m[1].toUpperCase();
  const amount = Number(m[2]);
  const meta = FX_CURRENCY[currency];
  if (!meta || !Number.isFinite(amount) || amount <= 0) {
    return { matched: false };
  }

  try {
    const url =
      `https://fin.paas.cmbchina.com/fininfo/api/calculator/fx-real-rate` +
      `?bsflag=buy&chflag=XH&currency=${meta.code}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      returnCode?: string;
      errorMsg?: string;
      body?: { rate?: number | string };
    };
    if (data.returnCode !== 'SUC0000' || data.body?.rate == null) {
      throw new Error(data.errorMsg || data.returnCode || '汇率查询失败');
    }
    const rate = Number(data.body.rate);
    const rmb = (amount * rate) / 100;
    // 牌价按「每 100 外币」计价 → 1 人民币可兑外币 = 100 / rate
    const perRmb = 100 / rate;
    const message =
      `${amount}${meta.name}需要支付${formatRmb(rmb)}元人民币。` +
      `当前汇率：100${meta.name}=${formatRmb(rate)}元人民币，` +
      `1元人民币约可兑换${formatRmb(perRmb)}${meta.name}`;
    return { matched: true, ok: true, currency, amount, rate, rmb, message };
  } catch (err) {
    console.warn('[fx] 购汇计算失败', text, (err as Error).message);
    return { matched: true, ok: false, message: '汇率查询失败，请稍后再试' };
  }
}
