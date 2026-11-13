class SkillSystem {
    static #lockedType = []

    // 锁定某一类技能
    static lock(type) {
        if (!this.#lockedType.includes(type)) {
            this.#lockedType.push(type);
        }
    }

    // 解锁某一类技能
    static unlock(type) {
        const idx = this.#lockedType.indexOf(type);
        if (idx > -1) {
            this.#lockedType.splice(idx, 1);
        }
    }

    // 判断该类型是否被锁定
    static isLocked(type) {
        return this.#lockedType.includes(type);
    }

    // 可选：一次性清空所有锁定
    static clearAllLock() {
        this.#lockedType = [];
    }

    // 可选：获取当前所有锁定类型（返回副本，防止外部篡改内部数组）
    static getLockedTypes() {
        return [...this.#lockedType];
    }
}

export class CharacterSkill {
    #animeTime = 0
    #animeTimer = null

    #singleFrameTime = 0.016666666

    #cooldownTime = 0
    #cooldownTimer = null

    constructor(option) {
        this.id = option.id
        this.name = option.name
        this.type = option.type
        this.cooldown = option.cooldown
        this.energyCost = option.energyCost
        this.energyGain = option.energyGain
        this.hasNextSkillId = option.hasNextSkillId
        this.animeDuration = option.animeDuration
        this.chargeAble = option.chargeAble || false
        this.chargeFreq = option.chargeFreq || 1
    }

    execute() {
        if (SkillSystem.isLocked(this.type)) return

        SkillSystem.lock(this.type)
        this.#animeTime = this.animeDuration
        this.#animeTimer = setInterval(() => {
            this.#animeTime -= this.#singleFrameTime
            if (this.#animeTime <= 0) {
                this.#animeTime = 0
                clearInterval(this.#animeTimer)
                SkillSystem.unlock(this.type)
            }
        }, this.#singleFrameTime)

        this.#cooldownTime = this.cooldown
        this.#cooldownTimer = setInterval(() => {
            this.#cooldownTime -= this.#singleFrameTime
            if (this.#cooldownTime <= 0) {
                this.#cooldownTime = 0
                clearInterval(this.#cooldownTimer)
            }
        }, this.#singleFrameTime)
    }

    get cooldownTime() {
        return this.#cooldownTime.toFixed(2)
    }
}