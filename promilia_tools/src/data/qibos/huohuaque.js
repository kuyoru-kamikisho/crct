/** 火花雀 */
export default {
  id: "huohuaque",
  no: 45,
  name: "火花雀",
  wikiSlug: "火花雀",
  wikiUrl: "https://wiki.biligame.com/ap/火花雀",
  elements: [
    "火"
  ],
  battleTag: "猛袭",
  race: "异生类·羽形族",
  height: "35cm",
  stage: "幼年期",
  sizeType: "小",
  shiny: true,
  special: false,
  obtain: "待补充",
  intro: "火花雀颈部的羽毛颜色犹如火焰，一直延展至翅膀。虽然个头不大，但已经能够通过摩擦爪尖产生火花来吓退对手。",
  image: "/imgs/qibos/huohuaque.png",
  pixelImageUrl: "https://patchwiki.biligame.com/images/ap/3/32/i7c0fev6glzuntf0tepezglzha85atc.png",
  imageWidth: 768,
  imageHeight: 96,
  homeJobs: [
    "燃火",
    "狩猎"
  ],
  drops: [
    "斑斓飞羽",
    "锋锐利喙",
    "新鲜的蛋"
  ],
  skills: [
    {
      name: "火花旋风",
      maxLevel: 5,
      desc: "冲向敌人形成小型火龙卷，每次造成247.1%攻击力的火属性伤害。",
      levels: [
        {
          level: 1,
          desc: "冲向敌人形成小型火龙卷，每次造成95%攻击力的火属性伤害。"
        },
        {
          level: 2,
          desc: "冲向敌人形成小型火龙卷，每次造成133.1%攻击力的火属性伤害。"
        },
        {
          level: 3,
          desc: "冲向敌人形成小型火龙卷，每次造成171.1%攻击力的火属性伤害。"
        },
        {
          level: 4,
          desc: "冲向敌人形成小型火龙卷，每次造成209.1%攻击力的火属性伤害。"
        },
        {
          level: 5,
          desc: "冲向敌人形成小型火龙卷，每次造成247.1%攻击力的火属性伤害。"
        }
      ]
    },
    {
      name: "火球",
      maxLevel: 5,
      desc: "向目标发射3枚火球，造成23.8%攻击力的火属性伤害。",
      levels: [
        {
          level: 1,
          desc: "向目标发射3枚火球，造成9.1%攻击力的火属性伤害。"
        },
        {
          level: 2,
          desc: "向目标发射3枚火球，造成12.8%攻击力的火属性伤害。"
        },
        {
          level: 3,
          desc: "向目标发射3枚火球，造成16.5%攻击力的火属性伤害。"
        },
        {
          level: 4,
          desc: "向目标发射3枚火球，造成20.1%攻击力的火属性伤害。"
        },
        {
          level: 5,
          desc: "向目标发射3枚火球，造成23.8%攻击力的火属性伤害。"
        }
      ]
    },
    {
      name: "火花雀-合击",
      maxLevel: 5,
      desc: "向目标射出火花攻击，造成652.9%攻击力的火属性伤害，对架势槽造成大量伤害。",
      levels: [
        {
          level: 1,
          desc: "向目标射出火花攻击，造成251.1%攻击力的火属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 2,
          desc: "向目标射出火花攻击，造成351.6%攻击力的火属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 3,
          desc: "向目标射出火花攻击，造成452%攻击力的火属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 4,
          desc: "向目标射出火花攻击，造成552.5%攻击力的火属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 5,
          desc: "向目标射出火花攻击，造成652.9%攻击力的火属性伤害，对架势槽造成大量伤害。"
        }
      ]
    }
  ],
  properties: [
    {
      name: "飞行",
      desc: "增加15%移动速度以及15%闪避率。"
    },
    {
      name: "燃喙Ⅰ",
      desc: "奇波对决中，自身生命值降低30%，入场时自动释放一次特技，特技伤害提升100%，但后续特技将无法使用，特技无法对对决设施造成伤害。"
    }
  ],
  evolutions: [
    {
      name: "火花雀",
      no: 45,
      stage: "幼年期",
      wikiSlug: "火花雀"
    },
    {
      name: "焰火雀",
      no: 46,
      stage: "成长期",
      wikiSlug: "焰火雀"
    },
    {
      name: "火烈鹰",
      no: 47,
      stage: "成熟期",
      wikiSlug: "火烈鹰"
    }
  ]
}
