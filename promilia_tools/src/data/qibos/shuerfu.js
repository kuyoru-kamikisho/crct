/** 竖耳蝠 */
export default {
  id: "shuerfu",
  no: 126,
  name: "竖耳蝠",
  wikiSlug: "竖耳蝠",
  wikiUrl: "https://wiki.biligame.com/ap/竖耳蝠",
  elements: [
    "暗"
  ],
  battleTag: "变换",
  race: "幻生类·精怪族",
  height: "60cm",
  stage: "幼年期",
  sizeType: "小",
  shiny: false,
  special: false,
  obtain: "待补充",
  intro: "脾气急躁的小型奇波，喜欢待在阴暗且安静的区域。体力较差，移动速度不快。飞行完全依靠魔力驱动，身后的小翅膀只不过是用来战斗和保持平衡的。",
  image: "/imgs/qibos/shuerfu.png",
  pixelImageUrl: "https://patchwiki.biligame.com/images/ap/3/35/fe9468n2wte78xt4xikcvihfgy71x0w.png",
  imageWidth: 768,
  imageHeight: 96,
  homeJobs: [
    "狩猎",
    "照料"
  ],
  drops: [
    "密文轮盘",
    "凝形晶核"
  ],
  skills: [
    {
      name: "音波",
      maxLevel: 5,
      desc: "发出音波，对前方的敌人造成四次5.3%攻击力的暗属性伤害。\n为队伍添加1枚暗属性调谐印记。",
      levels: [
        {
          level: 1,
          desc: "发出音波，对前方的敌人造成四次2%攻击力的暗属性伤害。\n为队伍添加1枚暗属性调谐印记。"
        },
        {
          level: 2,
          desc: "发出音波，对前方的敌人造成四次2.9%攻击力的暗属性伤害。\n为队伍添加1枚暗属性调谐印记。"
        },
        {
          level: 3,
          desc: "发出音波，对前方的敌人造成四次3.7%攻击力的暗属性伤害。\n为队伍添加1枚暗属性调谐印记。"
        },
        {
          level: 4,
          desc: "发出音波，对前方的敌人造成四次4.5%攻击力的暗属性伤害。\n为队伍添加1枚暗属性调谐印记。"
        },
        {
          level: 5,
          desc: "发出音波，对前方的敌人造成四次5.3%攻击力的暗属性伤害。\n为队伍添加1枚暗属性调谐印记。"
        }
      ]
    },
    {
      name: "暗魂影",
      maxLevel: 5,
      desc: "向目标发射一道暗魂影，对命中的敌人造成71.3%攻击力的暗属性伤害。",
      levels: [
        {
          level: 1,
          desc: "向目标发射一道暗魂影，对命中的敌人造成27.4%攻击力的暗属性伤害。"
        },
        {
          level: 2,
          desc: "向目标发射一道暗魂影，对命中的敌人造成38.4%攻击力的暗属性伤害。"
        },
        {
          level: 3,
          desc: "向目标发射一道暗魂影，对命中的敌人造成49.4%攻击力的暗属性伤害。"
        },
        {
          level: 4,
          desc: "向目标发射一道暗魂影，对命中的敌人造成60.3%攻击力的暗属性伤害。"
        },
        {
          level: 5,
          desc: "向目标发射一道暗魂影，对命中的敌人造成71.3%攻击力的暗属性伤害。"
        }
      ]
    },
    {
      name: "竖耳蝠-合击",
      maxLevel: 5,
      desc: "向目标发起攻击，造成652.9%攻击力的暗属性伤害，对架势槽造成大量伤害。",
      levels: [
        {
          level: 1,
          desc: "向目标发起攻击，造成251.1%攻击力的暗属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 2,
          desc: "向目标发起攻击，造成351.6%攻击力的暗属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 3,
          desc: "向目标发起攻击，造成452%攻击力的暗属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 4,
          desc: "向目标发起攻击，造成552.5%攻击力的暗属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 5,
          desc: "向目标发起攻击，造成652.9%攻击力的暗属性伤害，对架势槽造成大量伤害。"
        }
      ]
    }
  ],
  properties: [
    {
      name: "生命吸取",
      desc: "攻击敌人后5秒内，敌人每秒受到20%奇波攻击的伤害，自身每秒恢复2%奇波攻击的生命。"
    },
    {
      name: "蝠翼Ⅰ",
      desc: "奇波对决中，对敌人造成伤害后，使对方攻击力降低10%，持续3秒。"
    }
  ],
  evolutions: [
    {
      name: "竖耳蝠",
      no: 126,
      stage: "幼年期",
      wikiSlug: "竖耳蝠"
    },
    {
      name: "嘻哈蝠",
      no: 127,
      stage: "成长期",
      wikiSlug: "嘻哈蝠"
    },
    {
      name: "笑面蝠",
      no: 128,
      stage: "成熟期",
      wikiSlug: "笑面蝠"
    }
  ]
}
