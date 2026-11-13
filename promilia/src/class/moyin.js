import { Character, CharacterSkill, SkillTypes, SetBuff } from './character.js'

export default moyin = () => {
    const c = new Character({
        id: 'moyin',
        name: '末音',
        pugong:[
            new CharacterSkill({
                id: 'pugong1',
                name: '普攻',
                type: SkillTypes.Pugong,
                cooldown: 0,
                energyCost: 0,
                energyGain: 3,
                hasNextSkillId: 'pugong2',
                animeDuration: 0.2,
            }),
            new CharacterSkill({
                id: 'pugong2',
                name: '普攻',
                type: SkillTypes.Pugong,
                cooldown: 0,
                energyCost: 0,
                energyGain: 3,
                hasNextSkillId: 'pugong3',
                animeDuration: 0.4,
            }),
            new CharacterSkill({
                id: 'pugong3',
                name: '普攻',
                type: SkillTypes.Pugong,
                cooldown: 0,
                energyCost: 0,
                energyGain: 3,
                hasNextSkillId: 'pugong4',
                animeDuration: 1,
            }),
            new CharacterSkill({
                id: 'pugong4',
                name: '普攻',
                type: SkillTypes.Pugong,
                cooldown: 0,
                energyCost: 0,
                energyGain: 6,
                hasNextSkillId: 'pugong5',
                animeDuration: .7,
            }),
            new CharacterSkill({
                id: 'pugong5',
                name: '普攻',
                type: SkillTypes.Pugong,
                cooldown: 0,
                energyCost: 0,
                energyGain: 10,
                hasNextSkillId: 'pugong1',
                animeDuration: 1,
            }),
        ],
        ejineng:[
            new CharacterSkill({
                id: 'ejineng1',
                name: '星鸣技',
                type: SkillTypes.EJineng,
                cooldown: 15,
                energyCost: 0,
                energyGain: 10,
                hasNextSkillId: null,
                animeDuration: .5,
                chargeAble: true,
                chargeFreq: 2,
            }),
        ],
        rjineng:[
            new CharacterSkill({
                id: 'rjineng1',
                name: '星绝技',
                type: SkillTypes.RJineng,
                cooldown: 0,
                energyMax: 100,
                energyCost: 100,
                energyGain: 0,
                hasNextSkillId: null,
                animeDuration: 3.4,
            }),
        ],
    })

    return c
}