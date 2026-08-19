/** 红宝虫 */
export default {
  id: "hongbaochong",
  no: 99,
  name: "红宝虫",
  wikiSlug: "红宝虫",
  wikiUrl: "https://wiki.biligame.com/ap/红宝虫",
  elements: [
    "地",
    "火"
  ],
  battleTag: "侵扰",
  race: "异生类·蜕形族",
  height: "30cm",
  stage: "幼年期",
  sizeType: "小",
  shiny: false,
  special: false,
  obtain: "待补充",
  intro: "性格胆小的奇波，反应慢，基本没有任何攻击性，遇到危险只会缩成一团，依靠硬壳保护自己。以宝石矿为食的特性让矿工很头疼。",
  image: "/imgs/qibos/hongbaochong.png",
  pixelImageUrl: "https://patchwiki.biligame.com/images/ap/3/37/srfgdb5kyoii7jm07hqbbcs9axhe38d.png",
  imageWidth: 768,
  imageHeight: 96,
  homeJobs: [
    "采矿"
  ],
  drops: [
    "移形软壳",
    "遗落旧蜕",
    "焰光石原石"
  ],
  skills: [
    {
      name: "宝石飞射",
      maxLevel: 5,
      desc: "向前方抛射三枚红宝石碎片，每枚碎片造成89.4%攻击力的火属性伤害。\n为队伍添加1枚火属性调谐印记。",
      levels: [
        {
          level: 1,
          desc: "向前方抛射三枚红宝石碎片，每枚碎片造成34.4%攻击力的火属性伤害。\n为队伍添加1枚火属性调谐印记。"
        },
        {
          level: 2,
          desc: "向前方抛射三枚红宝石碎片，每枚碎片造成48.2%攻击力的火属性伤害。\n为队伍添加1枚火属性调谐印记。"
        },
        {
          level: 3,
          desc: "向前方抛射三枚红宝石碎片，每枚碎片造成61.9%攻击力的火属性伤害。\n为队伍添加1枚火属性调谐印记。"
        },
        {
          level: 4,
          desc: "向前方抛射三枚红宝石碎片，每枚碎片造成75.7%攻击力的火属性伤害。\n为队伍添加1枚火属性调谐印记。"
        },
        {
          level: 5,
          desc: "向前方抛射三枚红宝石碎片，每枚碎片造成89.4%攻击力的火属性伤害。\n为队伍添加1枚火属性调谐印记。"
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
      name: "红宝虫-合击",
      maxLevel: 5,
      desc: "向目标撞击，造成652.9%攻击力的火属性伤害，对架势槽造成大量伤害。",
      levels: [
        {
          level: 1,
          desc: "向目标撞击，造成251.1%攻击力的火属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 2,
          desc: "向目标撞击，造成351.6%攻击力的火属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 3,
          desc: "向目标撞击，造成452%攻击力的火属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 4,
          desc: "向目标撞击，造成552.5%攻击力的火属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 5,
          desc: "向目标撞击，造成652.9%攻击力的火属性伤害，对架势槽造成大量伤害。"
        }
      ]
    }
  ],
  properties: [
    {
      name: "岩石皮肤",
      desc: "自身防御力上升20%，火属性与雷属性抗性提升15%。"
    },
    {
      name: "宝石身躯Ⅰ",
      desc: "奇波对决中，自身攻击力降低30%，防御力提升80%，友方奇波防御力提升30%。"
    }
  ],
  evolutions: [
    {
      name: "红宝虫",
      no: 99,
      stage: "幼年期",
      wikiSlug: "红宝虫"
    },
    {
      name: "赤晶甲",
      no: 100,
      stage: "成长期",
      wikiSlug: "赤晶甲"
    },
    {
      name: "炎晶甲",
      no: 101,
      stage: "成熟期",
      wikiSlug: "炎晶甲"
    }
  ]
}
