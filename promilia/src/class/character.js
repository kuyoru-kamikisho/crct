/** 技能类型 */
export const SkillTypes = {
  Pugong: 'pugong',
  EJineng: 'ejineng',
  RJineng: 'rjineng',
  XJineng: 'xjineng',
  Zhuiji: 'zhuiji',
}

const FRAME = 1 / 60

/** 全局技能类型锁：动画期间同类型不可再放 */
class SkillSystem {
  static #lockedType = []

  static lock(type) {
    if (!this.#lockedType.includes(type)) {
      this.#lockedType.push(type)
    }
  }

  static unlock(type) {
    const idx = this.#lockedType.indexOf(type)
    if (idx > -1) this.#lockedType.splice(idx, 1)
  }

  static isLocked(type) {
    return this.#lockedType.includes(type)
  }

  static clearAllLock() {
    this.#lockedType = []
  }

  static getLockedTypes() {
    return [...this.#lockedType]
  }
}

/**
 * Buff
 * @param {object} option
 * @param {string} option.id
 * @param {string} option.name
 * @param {number} option.duration 秒
 * @param {object} [option.data] 附加数据
 */
export class SetBuff {
  #remain = 0
  #timer = null

  constructor(option) {
    this.id = option.id
    this.name = option.name
    this.duration = option.duration
    this.data = option.data || {}
    this.#remain = option.duration
  }

  /** 重新施加 / 刷新持续时间 */
  refresh(duration = this.duration) {
    this.duration = duration
    this.#remain = duration
    this.#startTick()
  }

  #startTick() {
    if (this.#timer) clearInterval(this.#timer)
    this.#timer = setInterval(() => {
      this.#remain -= FRAME
      if (this.#remain <= 0) {
        this.#remain = 0
        clearInterval(this.#timer)
        this.#timer = null
        this.onExpire?.()
      }
    }, FRAME * 1000)
  }

  start() {
    this.refresh(this.duration)
  }

  clear() {
    if (this.#timer) clearInterval(this.#timer)
    this.#timer = null
    this.#remain = 0
  }

  get remain() {
    return Math.max(0, this.#remain)
  }

  get active() {
    return this.#remain > 0
  }

  get remainText() {
    return this.#remain.toFixed(1)
  }
}

/**
 * 单个技能段
 */
export class CharacterSkill {
  #animeTime = 0
  #animeTimer = null
  #cooldownTime = 0
  #cooldownTimer = null
  #charges = 1
  #charging = false
  #owner = null
  #busy = false

  constructor(option) {
    this.id = option.id
    this.name = option.name
    this.type = option.type
    this.cooldown = option.cooldown ?? 0
    this.energyCost = option.energyCost ?? 0
    this.energyGain = option.energyGain ?? 0
    this.hasNextSkillId = option.hasNextSkillId ?? null
    this.animeDuration = option.animeDuration ?? 0.3
    this.chargeAble = option.chargeAble || false
    this.chargeFreq = option.chargeFreq || 1
    this.damage = option.damage ?? 0
    this.damageLabel = option.damageLabel || ''
    this.deriveToId = option.deriveToId || null
    this.onExecute = option.onExecute || null
    this.onHit = option.onHit || null
    this.canDerive = option.canDerive || null
    this.#charges = this.chargeAble ? this.chargeFreq : 1
  }

  bind(owner) {
    this.#owner = owner
    return this
  }

  get owner() {
    return this.#owner
  }

  get charges() {
    return this.#charges
  }

  get maxCharges() {
    return this.chargeAble ? this.chargeFreq : 1
  }

  get cooldownTime() {
    return Number(this.#cooldownTime.toFixed(2))
  }

  get cooldownText() {
    return this.#cooldownTime > 0 ? this.#cooldownTime.toFixed(1) : ''
  }

  get animeTime() {
    return Number(this.#animeTime.toFixed(2))
  }

  get isAnimating() {
    return this.#busy
  }

  get isReady() {
    if (SkillSystem.isLocked(this.type) && this.type !== SkillTypes.Zhuiji) return false
    if (this.chargeAble) return this.#charges > 0
    if (this.#cooldownTime > 0) return false
    if (this.energyCost > 0 && this.#owner && this.#owner.energy < this.energyCost) return false
    return true
  }

  /** 立刻刷新冷却 / 回满充能 */
  refreshCooldown() {
    if (this.#cooldownTimer) {
      clearInterval(this.#cooldownTimer)
      this.#cooldownTimer = null
    }
    this.#cooldownTime = 0
    this.#charging = false
    if (this.chargeAble) this.#charges = this.chargeFreq
  }

  /**
   * 尝试施放
   * @returns {{ ok: boolean, reason?: string, result?: object }}
   */
  execute(ctx = {}) {
    if (this.#busy) return { ok: false, reason: '动画中' }
    if (SkillSystem.isLocked(this.type) && this.type !== SkillTypes.Zhuiji) {
      return { ok: false, reason: '技能锁定中' }
    }
    if (this.chargeAble) {
      if (this.#charges <= 0) return { ok: false, reason: '充能耗尽' }
    } else if (this.#cooldownTime > 0) {
      return { ok: false, reason: '冷却中' }
    }
    if (this.energyCost > 0 && this.#owner && this.#owner.energy < this.energyCost) {
      return { ok: false, reason: '能量不足' }
    }

    // 消耗
    if (this.chargeAble) {
      this.#charges -= 1
      this.#startChargeRecover()
    } else if (this.cooldown > 0) {
      this.#startCooldown()
    }
    if (this.energyCost > 0) this.#owner?.spendEnergy(this.energyCost)
    if (this.energyGain > 0) this.#owner?.gainEnergy(this.energyGain)

    // 动画锁
    this.#busy = true
    SkillSystem.lock(this.type)
    this.#animeTime = this.animeDuration
    if (this.#animeTimer) clearInterval(this.#animeTimer)
    this.#animeTimer = setInterval(() => {
      this.#animeTime -= FRAME
      if (this.#animeTime <= 0) {
        this.#animeTime = 0
        clearInterval(this.#animeTimer)
        this.#animeTimer = null
        this.#busy = false
        SkillSystem.unlock(this.type)
        this.#owner?.onSkillAnimeEnd?.(this)
      }
      this.#owner?.notify?.()
    }, FRAME * 1000)

    const result = {
      skill: this,
      damage: this.damage,
      damageLabel: this.damageLabel,
      overlimit: null,
      logs: [],
    }

    // 角色自定义逻辑（印记 / 超限 / buff）
    this.onExecute?.(this, result, ctx)
    this.onHit?.(this, result, ctx)
    this.#owner?.onSkillExecuted?.(this, result, ctx)
    this.#owner?.notify?.()

    return { ok: true, result }
  }

  #startCooldown() {
    this.#cooldownTime = this.cooldown
    if (this.#cooldownTimer) clearInterval(this.#cooldownTimer)
    this.#cooldownTimer = setInterval(() => {
      this.#cooldownTime -= FRAME
      if (this.#cooldownTime <= 0) {
        this.#cooldownTime = 0
        clearInterval(this.#cooldownTimer)
        this.#cooldownTimer = null
      }
      this.#owner?.notify?.()
    }, FRAME * 1000)
  }

  /** 充能恢复：有空位时按 cooldown 逐层回充 */
  #startChargeRecover() {
    if (this.#charging) return
    if (this.#charges >= this.chargeFreq) return
    this.#charging = true
    this.#cooldownTime = this.cooldown
    if (this.#cooldownTimer) clearInterval(this.#cooldownTimer)
    this.#cooldownTimer = setInterval(() => {
      this.#cooldownTime -= FRAME
      if (this.#cooldownTime <= 0) {
        this.#charges = Math.min(this.chargeFreq, this.#charges + 1)
        if (this.#charges < this.chargeFreq) {
          this.#cooldownTime = this.cooldown
        } else {
          this.#cooldownTime = 0
          this.#charging = false
          clearInterval(this.#cooldownTimer)
          this.#cooldownTimer = null
        }
      }
      this.#owner?.notify?.()
    }, FRAME * 1000)
  }
}

/**
 * 角色基类：能量、印记、Buff、技能调度
 */
export class Character {
  #skills = new Map()
  #buffs = new Map()
  #comboWindow = 1.0
  #comboRemain = 0
  #comboTimer = null
  #pugongIndex = 0
  #pendingPugongId = null
  #listeners = new Set()
  #logSeq = 0

  constructor(option) {
    this.id = option.id
    this.name = option.name
    this.energyMax = option.energyMax ?? 100
    this.energy = option.energy ?? 0
    this.marks = {
      lei: option.marks?.lei ?? 0,
      feng: option.marks?.feng ?? 0,
    }
    /** 单个印记种类上限 */
    this.markMax = option.markMax ?? 5
    this.logs = []
    this.tick = 0

    const all = [
      ...(option.pugong || []),
      ...(option.ejineng || []),
      ...(option.rjineng || []),
      ...(option.xjineng || []),
      ...(option.extraSkills || []),
    ]
    all.forEach((s) => {
      s.bind(this)
      this.#skills.set(s.id, s)
    })

    this._pugongList = option.pugong || []
    this._ejinengList = option.ejineng || []
    this._rjinengList = option.rjineng || []
    this._xjinengList = option.xjineng || []
  }

  /** Vue 订阅刷新 */
  subscribe(fn) {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }

  notify() {
    this.tick++
    this.#listeners.forEach((fn) => fn(this.tick))
  }

  getSkill(id) {
    return this.#skills.get(id)
  }

  /** 当前普攻段 */
  get pugong() {
    if (this.#pendingPugongId) {
      return this.#skills.get(this.#pendingPugongId) || this._pugongList[0]
    }
    return this._pugongList[this.#pugongIndex] || this._pugongList[0]
  }

  get ejineng() {
    return this._ejinengList[0]
  }

  get rjineng() {
    return this._rjinengList[0]
  }

  get xjineng() {
    return this._xjinengList[0]
  }

  get pugongSegment() {
    const cur = this.pugong
    if (!cur) return 0
    const idx = this._pugongList.findIndex((s) => s.id === cur.id)
    return idx >= 0 ? idx + 1 : 1
  }

  get buffList() {
    return [...this.#buffs.values()].filter((b) => b.active)
  }

  hasBuff(id) {
    const b = this.#buffs.get(id)
    return !!(b && b.active)
  }

  getBuff(id) {
    const b = this.#buffs.get(id)
    return b && b.active ? b : null
  }

  /**
   * 施加 / 刷新 Buff
   * @param {SetBuff|object} buffOrOption
   */
  applyBuff(buffOrOption) {
    const buff =
      buffOrOption instanceof SetBuff
        ? buffOrOption
        : new SetBuff(buffOrOption)

    const exist = this.#buffs.get(buff.id)
    if (exist) {
      exist.refresh(buff.duration)
      this.pushLog(`刷新「${buff.name}」 ${buff.duration}s`)
    } else {
      buff.onExpire = () => {
        this.#buffs.delete(buff.id)
        this.pushLog(`「${buff.name}」结束`)
        this.notify()
      }
      this.#buffs.set(buff.id, buff)
      buff.start()
      this.pushLog(`获得「${buff.name}」 ${buff.duration}s`)
    }
    this.notify()
    return this.#buffs.get(buff.id)
  }

  removeBuff(id) {
    const b = this.#buffs.get(id)
    if (b) {
      b.clear()
      this.#buffs.delete(id)
      this.notify()
    }
  }

  /** 当前印记总数（仅展示用） */
  get markTotal() {
    return Object.values(this.marks).reduce((sum, n) => sum + n, 0)
  }

  addMark(type, n = 1) {
    const key = type === 'feng' || type === '风' ? 'feng' : 'lei'
    const label = key === 'lei' ? '雷' : '风'
    const before = this.marks[key]
    const room = Math.max(0, this.markMax - before)
    const gained = Math.min(n, room)
    if (gained <= 0) {
      this.pushLog(`${label}印记已满（${before}/${this.markMax}），无法再获得`)
      this.notify()
      return 0
    }
    this.marks[key] = before + gained
    this.pushLog(`获得${label}印记 ×${gained}（当前 ${this.marks[key]}/${this.markMax}）`)
    this.notify()
    return gained
  }

  /**
   * 消耗印记
   * @returns {number} 实际消耗数量
   */
  consumeMark(type, n = 1) {
    const key = type === 'feng' || type === '风' ? 'feng' : 'lei'
    const used = Math.min(this.marks[key], n)
    this.marks[key] -= used
    if (used > 0) {
      this.pushLog(`消耗${key === 'lei' ? '雷' : '风'}印记 ×${used}（剩余 ${this.marks[key]}）`)
    }
    this.notify()
    return used
  }

  gainEnergy(n) {
    const before = this.energy
    this.energy = Math.min(this.energyMax, this.energy + n)
    const gained = this.energy - before
    if (gained > 0) this.pushLog(`星决蓄能 +${gained}（${this.energy}/${this.energyMax}）`)
    this.notify()
    return gained
  }

  spendEnergy(n) {
    this.energy = Math.max(0, this.energy - n)
    this.notify()
  }

  pushLog(msg) {
    this.#logSeq++
    this.logs.unshift({ id: this.#logSeq, time: Date.now(), msg })
    if (this.logs.length > 80) this.logs.length = 80
  }

  /** 强制下一段普攻（派生） */
  setNextPugong(skillId) {
    this.#pendingPugongId = skillId
    this.#startComboWindow()
    this.notify()
  }

  /** 重置普攻连段 */
  resetCombo() {
    this.#pugongIndex = 0
    this.#pendingPugongId = null
    this.#comboRemain = 0
    if (this.#comboTimer) {
      clearInterval(this.#comboTimer)
      this.#comboTimer = null
    }
    this.notify()
  }

  #startComboWindow() {
    this.#comboRemain = this.#comboWindow
    if (this.#comboTimer) clearInterval(this.#comboTimer)
    this.#comboTimer = setInterval(() => {
      this.#comboRemain -= FRAME
      if (this.#comboRemain <= 0) {
        this.#comboRemain = 0
        clearInterval(this.#comboTimer)
        this.#comboTimer = null
        this.#pugongIndex = 0
        this.#pendingPugongId = null
        this.notify()
      }
    }, FRAME * 1000)
  }

  #advanceCombo(skill) {
    if (this.#pendingPugongId) {
      const idx = this._pugongList.findIndex((s) => s.id === this.#pendingPugongId)
      this.#pugongIndex = idx >= 0 ? idx : 0
      this.#pendingPugongId = null
    }

    if (skill.hasNextSkillId) {
      const nextIdx = this._pugongList.findIndex((s) => s.id === skill.hasNextSkillId)
      this.#pugongIndex = nextIdx >= 0 ? nextIdx : 0
    } else {
      this.#pugongIndex = 0
    }
    this.#startComboWindow()
  }

  /**
   * 施放普攻。若星鸣技/星携技允许派生追击，则优先追击。
   */
  castPugong() {
    // 派生追击窗口（星鸣技施放中按攻击键）
    const derive = this.findDeriveChase()
    if (derive) {
      return this.castSkill(derive)
    }
    return this.castSkill(this.pugong)
  }

  castEjineng() {
    return this.castSkill(this.ejineng)
  }

  castRjineng() {
    return this.castSkill(this.rjineng)
  }

  castXjineng() {
    return this.castSkill(this.xjineng)
  }

  /** 查找当前可派生的追击技 */
  findDeriveChase() {
    for (const s of this.#skills.values()) {
      if (s.type === SkillTypes.Zhuiji && s.canDerive?.(s)) return s
    }
    return null
  }

  castSkill(skill) {
    if (!skill) return { ok: false, reason: '无技能' }
    const ret = skill.execute()
    if (!ret.ok) {
      this.pushLog(`${skill.name} 失败：${ret.reason}`)
      this.notify()
      return ret
    }

    const { result } = ret
    const dmgText = result.damage ? `，伤害 ${result.damage}%` : ''
    const ol = result.overlimit
      ? `，超限 ${result.overlimit.label || ''} ${result.overlimit.damage || ''}`
      : ''
    this.pushLog(`施放【${skill.name}】${dmgText}${ol}`)

    if (skill.type === SkillTypes.Pugong) {
      this.#advanceCombo(skill)
    } else if (skill.type === SkillTypes.Zhuiji && skill.deriveToId) {
      this.setNextPugong(skill.deriveToId)
    } else if (skill.type !== SkillTypes.Pugong) {
      // 非普攻通常打断连段（追击除外，上面已处理派生）
      if (skill.type !== SkillTypes.Zhuiji) this.resetCombo()
    }

    this.notify()
    return ret
  }

  onSkillAnimeEnd(_skill) {
    // 子类可覆写
  }

  onSkillExecuted(_skill, _result, _ctx) {
    // 子类可覆写
  }

  /** 重置角色状态 */
  reset() {
    SkillSystem.clearAllLock()
    this.energy = 0
    this.marks.lei = 0
    this.marks.feng = 0
    this.#buffs.forEach((b) => b.clear())
    this.#buffs.clear()
    this.resetCombo()
    this.#skills.forEach((s) => s.refreshCooldown())
    this.logs = []
    this.#logSeq = 0
    this.pushLog('状态已重置')
    this.notify()
  }
}

export { SkillSystem }
