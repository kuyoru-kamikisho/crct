import {
  Character,
  CharacterSkill,
  SkillTypes,
  SetBuff,
} from './character.js'

/** 「璀璨」Buff */
const CUICAN = {
  id: 'cuican',
  name: '璀璨',
  duration: 8,
}

/**
 * 末音：哈库茵剑舞 / 涌雷动之跃 / 绽华章之舞 / 凝飓风之旋
 * 机制摘要：
 * - 普攻五段；第5段获得雷印记；有璀璨时第4段可耗1雷印记超限
 * - 星鸣技双充能 CD15s；施放中按攻击键派生追击 → 璀璨 → 可超限 → 派生普攻第4段
 * - 星决技耗100能量；耗至多各2枚雷/风印记各造成1次超限；刷新星鸣技CD
 * - 星携技入场后普攻可派生同样追击
 */
export function createMoyin() {
  /** 追击窗口：星鸣技动画中，或星携技后 */
  let chaseFromE = false
  let chaseFromX = false
  let eSkillRef = null

  const tryOverlimitLei = (character, result, reason) => {
    if (!character.hasBuff(CUICAN.id)) return false
    if (character.marks.lei < 1) return false
    character.consumeMark('lei', 1)
    result.overlimit = {
      element: 'lei',
      label: '雷超限',
      damage: '超限伤害',
      reason,
    }
    character.pushLog(`触发雷超限（${reason}）`)
    return true
  }

  const zhuiji = new CharacterSkill({
    id: 'zhuiji',
    name: '追击',
    type: SkillTypes.Zhuiji,
    cooldown: 0,
    energyCost: 0,
    energyGain: 5,
    animeDuration: 0.45,
    damage: 69,
    damageLabel: '雷',
    deriveToId: 'pugong4',
    canDerive: () => chaseFromE || chaseFromX,
    onExecute: (skill, result) => {
      const c = skill.owner
      c.applyBuff({ ...CUICAN })
      tryOverlimitLei(c, result, '追击命中')
      // 关闭对应窗口
      if (chaseFromE) chaseFromE = false
      if (chaseFromX) chaseFromX = false
    },
  })

  const pugong = [
    new CharacterSkill({
      id: 'pugong1',
      name: '普攻·一段',
      type: SkillTypes.Pugong,
      cooldown: 0,
      energyCost: 0,
      energyGain: 3,
      hasNextSkillId: 'pugong2',
      animeDuration: 0.4,
      damage: 40,
      damageLabel: '风雷',
    }),
    new CharacterSkill({
      id: 'pugong2',
      name: '普攻·二段',
      type: SkillTypes.Pugong,
      cooldown: 0,
      energyCost: 0,
      energyGain: 3,
      hasNextSkillId: 'pugong3',
      animeDuration: 0.6,
      damage: 50,
      damageLabel: '风雷',
    }),
    new CharacterSkill({
      id: 'pugong3',
      name: '普攻·三段',
      type: SkillTypes.Pugong,
      cooldown: 0,
      energyCost: 0,
      energyGain: 3,
      hasNextSkillId: 'pugong4',
      animeDuration: 1,
      damage: 60,
      damageLabel: '风雷',
    }),
    new CharacterSkill({
      id: 'pugong4',
      name: '普攻·四段',
      type: SkillTypes.Pugong,
      cooldown: 0,
      energyCost: 0,
      energyGain: 6,
      hasNextSkillId: 'pugong5',
      animeDuration: 1.6,
      damage: 80,
      damageLabel: '风雷',
      onHit: (skill, result) => {
        // 已获得「璀璨」时，第四段命中后可消耗1枚雷印记造成超限
        tryOverlimitLei(skill.owner, result, '璀璨·四段')
      },
    }),
    new CharacterSkill({
      id: 'pugong5',
      name: '普攻·五段',
      type: SkillTypes.Pugong,
      cooldown: 0,
      energyCost: 0,
      energyGain: 10,
      hasNextSkillId: 'pugong1',
      animeDuration: 1.8,
      damage: 90,
      damageLabel: '风雷',
      onHit: (skill) => {
        skill.owner.addMark('lei', 1)
      },
    }),
  ]

  const ejineng = [
    new CharacterSkill({
      id: 'ejineng1',
      name: '涌雷动之跃',
      type: SkillTypes.EJineng,
      cooldown: 15,
      energyCost: 0,
      energyGain: 10,
      animeDuration: 0.8,
      chargeAble: true,
      chargeFreq: 2,
      damage: 80,
      damageLabel: '雷',
      onExecute: (skill) => {
        eSkillRef = skill
        chaseFromE = true
        chaseFromX = false
        skill.owner.pushLog('可在星鸣技施放中按「攻击」派生追击')
      },
    }),
  ]

  const rjineng = [
    new CharacterSkill({
      id: 'rjineng1',
      name: '绽华章之舞',
      type: SkillTypes.RJineng,
      cooldown: 0,
      energyCost: 100,
      energyGain: 0,
      animeDuration: 3.4,
      damage: 380,
      damageLabel: '雷（多段）',
      onHit: (skill, result) => {
        const c = skill.owner
        // wiki：消耗至多各2枚雷/风印记，造成各1次对应属性超限
        const lei = c.consumeMark('lei', 2)
        const feng = c.consumeMark('feng', 2)
        const ols = []
        if (lei > 0) ols.push('雷超限×1')
        if (feng > 0) ols.push('风超限×1')
        result.overlimit = {
          element: 'lei+feng',
          label: ols.join(' + ') || '无印记',
          damage: ols.length ? '超限伤害' : '',
        }
        if (ols.length) c.pushLog(`星决超限：${result.overlimit.label}`)
        c.ejineng?.refreshCooldown()
        c.pushLog('星鸣技冷却已刷新')
        chaseFromE = false
      },
    }),
  ]

  const xjineng = [
    new CharacterSkill({
      id: 'xjineng1',
      name: '凝飓风之旋',
      type: SkillTypes.XJineng,
      cooldown: 0,
      energyCost: 0,
      energyGain: 8,
      animeDuration: 0.6,
      damage: 100,
      damageLabel: '雷',
      onExecute: (skill) => {
        chaseFromX = true
        chaseFromE = false
        skill.owner.pushLog('星携技后按「攻击」可派生追击')
      },
    }),
  ]

  const c = new Character({
    id: 'moyin',
    name: '末音',
    energyMax: 100,
    energy: 0,
    markMax: 5,
    pugong,
    ejineng,
    rjineng,
    xjineng,
    extraSkills: [zhuiji],
  })

  // 星鸣技：演出中可追击；演出结束后再沿用角色统一的 1s 窗口
  const rawAnimeEnd = c.onSkillAnimeEnd.bind(c)
  c.onSkillAnimeEnd = (skill) => {
    rawAnimeEnd(skill)
    if (skill?.id === 'ejineng1' && chaseFromE) {
      const waitMs = Math.round((c.comboWindow || 1) * 1000)
      setTimeout(() => {
        if (chaseFromE && eSkillRef === skill) {
          chaseFromE = false
          c.pushLog('追击窗口结束')
          c.notify()
        }
      }, waitMs)
    }
  }

  // 连段窗口到期时，若还开着追击窗也一并关掉
  c.onComboWindowEnd = () => {
    if (chaseFromE || chaseFromX) {
      chaseFromE = false
      chaseFromX = false
      c.pushLog('追击窗口结束')
    }
  }

  /** 调试：手动加风印记（星决可耗） */
  c.debugAddFeng = (n = 1) => c.addMark('feng', n)
  c.debugAddLei = (n = 1) => c.addMark('lei', n)
  c.debugFillEnergy = () => {
    c.energy = c.energyMax
    c.pushLog('能量已充满')
    c.notify()
  }
  c.debugCuican = () => c.applyBuff({ ...CUICAN })

  return c
}

export default createMoyin
