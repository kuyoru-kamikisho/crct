/**
 * 末音 · 用泛用 Character / CharacterSkill 组装的角色对象
 */

import iconA from '@/assets/skill/moyin/a.png'
import iconB from '@/assets/skill/moyin/b.png'
import iconC from '@/assets/skill/moyin/c.png'
import iconD from '@/assets/skill/moyin/d.png'
import iconE from '@/assets/skill/moyin/e.png'

import Character, {
    BuffDefinition,
    CharacterSkill,
    CharacterSkillType,
    ElementType,
    MarkDefinition,
    MarkType,
    NormalAttackCombo,
    SkillDerive,
    SkillHit,
} from './character.js'

/** Buff：璀璨 */
export const BUFF_BRILLIANCE = 'brilliance'

const brillianceBuff = new BuffDefinition({
    id: BUFF_BRILLIANCE,
    name: '璀璨',
    durationMs: 8000,
})

const thunderMark = new MarkDefinition({
    type: MarkType.thunder,
    name: '雷印记',
    max: 5,
})

const windMark = new MarkDefinition({
    type: MarkType.wind,
    name: '风印记',
    max: 5,
})

/** 普攻：至多五段，合计至多 320% 风+雷；四段可超限；五段得雷印 */
const pugong = new CharacterSkill({
    id: 'moyin-pugong',
    name: '普攻',
    type: CharacterSkillType.pugong,
    keyname: '左键',
    icon: iconA,
    combo: new NormalAttackCombo({
        maxSegments: 5,
        windowMs: 1000,
        maxDamagePercent: 320,
        elements: [ElementType.wind, ElementType.thunder],
        segments: [
            new SkillHit({
                damagePercent: 64,
                elements: [ElementType.wind, ElementType.thunder],
            }),
            new SkillHit({
                damagePercent: 64,
                elements: [ElementType.wind, ElementType.thunder],
            }),
            new SkillHit({
                damagePercent: 64,
                elements: [ElementType.wind, ElementType.thunder],
            }),
            new SkillHit({
                damagePercent: 64,
                elements: [ElementType.wind, ElementType.thunder],
                overlimit: true,
                requireBuffs: [BUFF_BRILLIANCE],
                consumeMarks: { [MarkType.thunder]: 1 },
            }),
            new SkillHit({
                damagePercent: 64,
                elements: [ElementType.wind, ElementType.thunder],
                gainMarks: { [MarkType.thunder]: 1 },
            }),
        ],
    }),
})

/** 星鸣追击（派生段，不单独占主槽） */
const xingmingChase = new CharacterSkill({
    id: 'moyin-xingming-chase',
    name: '星鸣·追击',
    type: CharacterSkillType.pugong,
    keyname: '左键',
    icon: iconA,
    derived: true,
    hits: [
        new SkillHit({
            damagePercent: 69,
            elements: [ElementType.thunder],
            grantBuffs: [BUFF_BRILLIANCE],
            overlimit: true,
            consumeMarks: { [MarkType.thunder]: 1 },
        }),
    ],
    derives: [
        new SkillDerive({
            from: 'moyin-xingming-chase',
            to: 'combo:4',
            input: CharacterSkillType.pugong,
        }),
    ],
})

/** 星鸣技：E，CD15，充能2 */
const xingming = new CharacterSkill({
    id: 'moyin-xingming',
    name: '星鸣技',
    type: CharacterSkillType.ejineng,
    keyname: 'E',
    icon: iconB,
    cooldown: 15_000,
    chargesMax: 2,
    hits: [
        new SkillHit({
            damagePercent: 80,
            elements: [ElementType.thunder],
        }),
    ],
    derives: [
        new SkillDerive({
            from: 'moyin-xingming',
            to: 'moyin-xingming-chase',
            input: CharacterSkillType.pugong,
        }),
    ],
})

/** 星决技：R 大招 */
const xingjue = new CharacterSkill({
    id: 'moyin-xingjue',
    name: '星决技',
    type: CharacterSkillType.rjineng,
    keyname: 'R',
    icon: iconC,
    energyCost: 100,
    hits: [
        new SkillHit({
            damagePercent: 380,
            elements: [ElementType.thunder],
            overlimit: true,
            consumeMarks: {
                [MarkType.thunder]: 2,
                [MarkType.wind]: 2,
            },
        }),
    ],
    refreshSkillTypes: [CharacterSkillType.ejineng],
})

/** 星携追击 */
const xingxieChase = new CharacterSkill({
    id: 'moyin-xingxie-chase',
    name: '星携·追击',
    type: CharacterSkillType.pugong,
    keyname: '左键',
    icon: iconA,
    derived: true,
    hits: [
        new SkillHit({
            damagePercent: 69,
            elements: [ElementType.thunder],
            grantBuffs: [BUFF_BRILLIANCE],
            overlimit: true,
            consumeMarks: { [MarkType.thunder]: 1 },
        }),
    ],
    derives: [
        new SkillDerive({
            from: 'moyin-xingxie-chase',
            to: 'combo:4',
            input: CharacterSkillType.pugong,
        }),
    ],
})

/** 星携技：入场 */
const xingxie = new CharacterSkill({
    id: 'moyin-xingxie',
    name: '星携技',
    type: CharacterSkillType.intro,
    keyname: '入场',
    icon: iconD,
    onEnter: true,
    hits: [
        new SkillHit({
            damagePercent: 100,
            elements: [ElementType.thunder],
        }),
    ],
    derives: [
        new SkillDerive({
            from: 'moyin-xingxie',
            to: 'moyin-xingxie-chase',
            input: CharacterSkillType.pugong,
        }),
    ],
})

/** 极限反击 */
const jixian = new CharacterSkill({
    id: 'moyin-jixian',
    name: '极限反击',
    type: CharacterSkillType.counter,
    keyname: '极限反击',
    icon: iconE,
    hits: [
        new SkillHit({
            damagePercent: 69,
            elements: [ElementType.thunder],
            grantBuffs: [BUFF_BRILLIANCE],
        }),
    ],
})

/** 完美招架 */
const wanmei = new CharacterSkill({
    id: 'moyin-wanmei',
    name: '完美招架',
    type: CharacterSkillType.parry,
    keyname: '招架',
    icon: iconE,
    hits: [
        new SkillHit({
            damagePercent: 70,
            elements: [ElementType.thunder],
            overlimit: true,
            requireBuffs: [BUFF_BRILLIANCE],
            consumeMarks: { [MarkType.thunder]: 1 },
        }),
    ],
})

/** 末音角色实例 */
export const moyin = new Character({
    id: 'moyin',
    name: '末音',
    energyMax: 100,
    marks: [thunderMark, windMark],
    buffs: [brillianceBuff],
    skills: [pugong, xingming, xingmingChase, xingjue, xingxie, xingxieChase, jixian, wanmei],
    meta: {
        treeLabels: {
            [CharacterSkillType.pugong]: 'A',
            [CharacterSkillType.ejineng]: 'B',
            [CharacterSkillType.rjineng]: 'C',
            [CharacterSkillType.intro]: 'D',
        },
    },
})

export default moyin

export const characters = [moyin]
