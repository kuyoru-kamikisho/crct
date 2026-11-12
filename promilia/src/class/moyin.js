import { Character, CharacterSkill, SkillTypes, InnerEmit, SetBuff } from './character.js'

export default moyin = () => {
    const c = new Character(
        // 角色id
        'moyin',

        // 姓名
        '末音',

        // 初始星绝技能量值
        0,

        // 普攻
        [
            // 参数清单：
            // 名称、
            // 技能类型(同时也是电脑端按键触发方式)、
            // 冷却时间秒(技能触发的先决条件之一，技能触发后开始倒计时，处于冷却中时无法再次触发)、
            // 触发所需能量值(技能触发的先决条件之一，能量值不达标时无法触发)、
            // 技能演出动画时间秒(演出期间不可以再次触发同类型技能)、
            // 下一步标识(next：技能演出持续时间内如果再次按下对应的按键，虽然不会在演出时间内重复触发同一个技能，但会在演出结束后触发同类型技能数组中的下一个技能)
            new CharacterSkill('普攻1', SkillTypes.mouseLeft, 0, 0, .4, InnerEmit.next),
            new CharacterSkill('普攻2', SkillTypes.mouseLeft, 0, 0, .6, InnerEmit.next),
            new CharacterSkill('普攻3', SkillTypes.mouseLeft, 0, 0, .8, InnerEmit.next),
            new CharacterSkill('普攻4', SkillTypes.mouseLeft, 0, 0, .8, InnerEmit.next),
            new CharacterSkill('普攻5', SkillTypes.mouseLeft, 0, 0, 1.2, InnerEmit.next),
        ],

        // 星鸣技
        [
            // InnerEmit.self: 技能演出过程中再次按下对应的按键，如果符合所有技能触发先决条件，则演出结束后自动再触发一次自身
            // InnerEmit.none: 技能演出过程中再次按下对应的按键，不执行任何额外逻辑
            new CharacterSkill('星鸣技', SkillTypes.keyE, 15, 0, .6, InnerEmit.none),
            new CharacterSkill('星鸣技', SkillTypes.keyE, 15, 0, .6, InnerEmit.none),
        ],

        // 星绝技
        [
            new CharacterSkill('星绝技', SkillTypes.keyR, 0, 100, 3, InnerEmit.none),
        ]

    )

    return c
}