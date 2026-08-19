/** 铁球蜥 */
export default {
  id: "tieqiuxi",
  no: 173,
  name: "铁球蜥",
  wikiSlug: "铁球蜥",
  wikiUrl: "https://wiki.biligame.com/ap/铁球蜥",
  elements: [
    "地"
  ],
  battleTag: "侵扰",
  race: "异生类·鳞形族",
  height: "60cm",
  stage: "幼年期",
  sizeType: "小",
  shiny: true,
  special: false,
  obtain: "待补充",
  intro: "铁球蜥的尾巴被坚硬的小球包裹着，习惯直立行走，性格温顺。然而，它尾部的摆锤，是以后与同族进行角斗的关键武器，即使在这个阶段，其破坏性也不可小觑。",
  image: "/imgs/qibos/tieqiuxi.png",
  pixelImageUrl: "https://patchwiki.biligame.com/images/ap/1/10/o1cgr9nrlqisz9llqpkmfuw68fog3d8.png",
  imageWidth: 768,
  imageHeight: 96,
  homeJobs: [
    "采矿"
  ],
  drops: [
    "幽光鳞片",
    "鳞光薄膜"
  ],
  skills: [
    {
      name: "尾锤击",
      maxLevel: 5,
      desc: "砸击目标区域，对附近的敌人造成三次104.4%攻击力的地属性伤害。",
      levels: [
        {
          level: 1,
          desc: "砸击目标区域，对附近的敌人造成三次40.2%攻击力的地属性伤害。"
        },
        {
          level: 2,
          desc: "砸击目标区域，对附近的敌人造成三次56.2%攻击力的地属性伤害。"
        },
        {
          level: 3,
          desc: "砸击目标区域，对附近的敌人造成三次72.3%攻击力的地属性伤害。"
        },
        {
          level: 4,
          desc: "砸击目标区域，对附近的敌人造成三次88.4%攻击力的地属性伤害。"
        },
        {
          level: 5,
          desc: "砸击目标区域，对附近的敌人造成三次104.4%攻击力的地属性伤害。"
        }
      ]
    },
    {
      name: "岩锥",
      maxLevel: 5,
      desc: "向目标发射一枚岩锥，对命中的敌人造成71.3%攻击力的地属性伤害。",
      levels: [
        {
          level: 1,
          desc: "向目标发射一枚岩锥，对命中的敌人造成27.4%攻击力的地属性伤害。"
        },
        {
          level: 2,
          desc: "向目标发射一枚岩锥，对命中的敌人造成38.4%攻击力的地属性伤害。"
        },
        {
          level: 3,
          desc: "向目标发射一枚岩锥，对命中的敌人造成49.4%攻击力的地属性伤害。"
        },
        {
          level: 4,
          desc: "向目标发射一枚岩锥，对命中的敌人造成60.3%攻击力的地属性伤害。"
        },
        {
          level: 5,
          desc: "向目标发射一枚岩锥，对命中的敌人造成71.3%攻击力的地属性伤害。"
        }
      ]
    },
    {
      name: "铁球蜥-合击",
      maxLevel: 5,
      desc: "向目标砸击，造成652.9%攻击力的地属性伤害，对架势槽造成大量伤害。",
      levels: [
        {
          level: 1,
          desc: "向目标砸击，造成251.1%攻击力的地属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 2,
          desc: "向目标砸击，造成351.6%攻击力的地属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 3,
          desc: "向目标砸击，造成452%攻击力的地属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 4,
          desc: "向目标砸击，造成552.5%攻击力的地属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 5,
          desc: "向目标砸击，造成652.9%攻击力的地属性伤害，对架势槽造成大量伤害。"
        }
      ]
    }
  ],
  properties: [
    {
      name: "破甲锤",
      desc: "特技命中可使敌人防御降低6%，移动速度降低10%，持续40秒。"
    },
    {
      name: "重锤Ⅰ",
      desc: "奇波对决中，自身特技伤害提升100%，特技冷却时间延长50%，特技无法对对决设施造成伤害。"
    }
  ],
  evolutions: [
    {
      name: "铁球蜥",
      no: 173,
      stage: "幼年期",
      wikiSlug: "铁球蜥"
    },
    {
      name: "三角蜥",
      no: 174,
      stage: "成熟期",
      wikiSlug: "三角蜥"
    },
    {
      name: "角斗蜥",
      no: 175,
      stage: "超限体",
      wikiSlug: "角斗蜥"
    }
  ]
}
