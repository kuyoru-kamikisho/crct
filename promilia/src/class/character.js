/**
 * 角色 / 技能 / 印记 / Buff 的泛用基类与枚举。
 * 具体角色（如末音）只组装数据，不在此写死机制。
 */

/** 技能槽位（跨角色复用；值可与按键或 UI 槽对应） */
export const CharacterSkillType = Object.freeze({
    /** 普攻 */
    pugong: 'A',
    /** E 技能（战技，如星鸣技） */
    ejineng: 'E',
    /** R 技能（大招，如星决技） */
    rjineng: 'R',
    /** 入场技（如星携技） */
    intro: 'INTRO',
    /** 辅助 / 额外技（如星赐） */
    support: 'SUPPORT',
    /** 极限反击 */
    counter: 'COUNTER',
    /** 完美招架 */
    parry: 'PARRY',
})

/** 元素属性 */
export const ElementType = Object.freeze({
    thunder: 'thunder',
    wind: 'wind',
    physical: 'physical',
})

/** 印记类型 */
export const MarkType = Object.freeze({
    thunder: 'thunder',
    wind: 'wind',
})

/**
 * 印记定义（上限、显示名等）
 */
export class MarkDefinition {
    /**
     * @param {{ type: string, name: string, max?: number }} opts
     */
    constructor({ type, name, max = 5 }) {
        this.type = type
        this.name = name
        this.max = max
    }
}

/**
 * Buff 定义（如「璀璨」）
 */
export class BuffDefinition {
    /**
     * @param {{ id: string, name: string, durationMs?: number }} opts
     */
    constructor({ id, name, durationMs = 0 }) {
        this.id = id
        this.name = name
        this.durationMs = durationMs
    }
}

/**
 * 单次命中 / 一段效果（伤害、耗印、得印、上 Buff、超限等）
 */
export class SkillHit {
    /**
     * @param {{
     *   damagePercent?: number,
     *   elements?: string[],
     *   gainMarks?: Record<string, number>,
     *   consumeMarks?: Record<string, number>,
     *   grantBuffs?: string[],
     *   overlimit?: boolean,
     *   requireBuffs?: string[],
     * }} opts
     */
    constructor({
        damagePercent = 0,
        elements = [],
        gainMarks = {},
        consumeMarks = {},
        grantBuffs = [],
        overlimit = false,
        requireBuffs = [],
    } = {}) {
        /** @type {number} 攻击力百分比 */
        this.damagePercent = damagePercent
        /** @type {string[]} */
        this.elements = [...elements]
        /** @type {Record<string, number>} */
        this.gainMarks = { ...gainMarks }
        /** @type {Record<string, number>} */
        this.consumeMarks = { ...consumeMarks }
        /** @type {string[]} */
        this.grantBuffs = [...grantBuffs]
        /** @type {boolean} */
        this.overlimit = overlimit
        /** @type {string[]} 触发超限等效果前需要的 Buff */
        this.requireBuffs = [...requireBuffs]
    }
}

/**
 * 派生关系：施放后可再按某键派生（追击、接普攻四段等）
 */
export class SkillDerive {
    /**
     * @param {{
     *   from: string,
     *   to: string,
     *   input?: string,
     *   require?: Record<string, unknown>,
     * }} opts
     */
    constructor({ from, to, input = CharacterSkillType.pugong, require = {} }) {
        /** @type {string} 源技能 id */
        this.from = from
        /** @type {string} 目标技能 id，或 'combo:4' 表示接普攻第 N 段 */
        this.to = to
        /** @type {string} */
        this.input = input
        /** @type {Record<string, unknown>} */
        this.require = { ...require }
    }
}

/**
 * 普攻连段配置
 */
export class NormalAttackCombo {
    /**
     * @param {{
     *   maxSegments?: number,
     *   windowMs?: number,
     *   maxDamagePercent?: number,
     *   elements?: string[],
     *   segments?: Array<SkillHit | object>,
     * }} opts
     */
    constructor({
        maxSegments = 5,
        windowMs = 1000,
        maxDamagePercent = 0,
        elements = [],
        segments = [],
    } = {}) {
        this.maxSegments = maxSegments
        this.windowMs = windowMs
        this.maxDamagePercent = maxDamagePercent
        this.elements = [...elements]
        this.segments = segments.map((s) => (s instanceof SkillHit ? s : new SkillHit(s)))
    }

    /** @param {number} index 1-based */
    getSegment(index) {
        return this.segments[index - 1] ?? null
    }
}

/**
 * 单个技能定义
 */
export class CharacterSkill {
    /**
     * @param {{
     *   id: string,
     *   name: string,
     *   type: string,
     *   keyname?: string,
     *   icon?: string,
     *   cooldown?: number,
     *   chargesMax?: number,
     *   energyCost?: number,
     *   energyGain?: number,
     *   hits?: Array<SkillHit | object>,
     *   derives?: Array<SkillDerive | object>,
     *   combo?: NormalAttackCombo | object | null,
     *   onEnter?: boolean,
     *   derived?: boolean,
     *   refreshSkillTypes?: string[],
     * }} opts
     */
    constructor({
        id,
        name,
        type,
        keyname = '',
        icon = '',
        cooldown = 0,
        chargesMax = 1,
        energyCost = 0,
        energyGain = 0,
        hits = [],
        derives = [],
        combo = null,
        onEnter = false,
        derived = false,
        refreshSkillTypes = [],
    }) {
        this.id = id
        this.name = name
        this.type = type
        this.keyname = keyname || type
        this.icon = icon
        /** 冷却毫秒 */
        this.cooldown = cooldown
        this.chargesMax = chargesMax
        this.energyCost = energyCost
        this.energyGain = energyGain
        this.hits = hits.map((h) => (h instanceof SkillHit ? h : new SkillHit(h)))
        this.derives = derives.map((d) => (d instanceof SkillDerive ? d : new SkillDerive(d)))
        this.combo =
            combo == null
                ? null
                : combo instanceof NormalAttackCombo
                    ? combo
                    : new NormalAttackCombo(combo)
        this.onEnter = onEnter
        /** 派生段（追击等），不占主技能槽 */
        this.derived = derived
        /** 释放后刷新这些槽位的冷却（如大招刷新 E） */
        this.refreshSkillTypes = [...refreshSkillTypes]
        this.triggerNum = 0
    }

    skillTriggered() {
        this.triggerNum += 1
        return this.triggerNum
    }

    get hasCharges() {
        return this.chargesMax > 1
    }

    get isUltimate() {
        return this.energyCost > 0
    }
}

/**
 * 角色基类：挂技能、印记与 Buff 定义，供模拟器 / UI 读取
 */
export class Character {
    /**
     * @param {{
     *   id: string,
     *   name: string,
     *   skills?: CharacterSkill[],
     *   marks?: Array<MarkDefinition | object>,
     *   buffs?: Array<BuffDefinition | object>,
     *   energyMax?: number,
     *   meta?: Record<string, unknown>,
     * }} opts
     */
    constructor({ id, name, skills = [], marks = [], buffs = [], energyMax = 100, meta = {} }) {
        this.id = id
        this.name = name
        this.skills = [...skills]
        this.marks = marks.map((m) => (m instanceof MarkDefinition ? m : new MarkDefinition(m)))
        this.buffs = buffs.map((b) => (b instanceof BuffDefinition ? b : new BuffDefinition(b)))
        this.energyMax = energyMax
        this.meta = { ...meta }
    }

    /** @param {string} type CharacterSkillType */
    getSkillByType(type) {
        return this.skills.find((s) => s.type === type && !s.derived) ?? null
    }

    /** 主技能列表（不含派生段） */
    getMainSkills() {
        return this.skills.filter((s) => !s.derived)
    }

    /** @param {string} id */
    getSkillById(id) {
        return this.skills.find((s) => s.id === id) ?? null
    }

    /** @param {string} markType MarkType */
    getMark(markType) {
        return this.marks.find((m) => m.type === markType) ?? null
    }

    /** @param {string} buffId */
    getBuff(buffId) {
        return this.buffs.find((b) => b.id === buffId) ?? null
    }

    /** 主界面三键：普攻 / E / R */
    getPrimarySkills() {
        return [CharacterSkillType.pugong, CharacterSkillType.ejineng, CharacterSkillType.rjineng]
            .map((t) => this.getSkillByType(t))
            .filter(Boolean)
    }
}

export default Character
