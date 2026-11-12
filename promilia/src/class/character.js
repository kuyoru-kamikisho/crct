export default class Character {
    name = ''
    skills = []
    constructor(name) {
        this.name = name
    }
}

export enum CharacterSkillType {
    pugong = 'A',
    ejineng = 'E',
    rjineng = 'R',
}

export class CharacterSkill {
    name = ''
    cooldown = 0
    energy = 0
    keyname = 'E'
    triggerNum = 0


    constructor(name) {
        super(name)
    }

    skillTriggered(){
        this.triggerNum++
    }
}