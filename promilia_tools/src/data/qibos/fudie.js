/** 浮蝶 */
export default {
  id: "fudie",
  no: 163,
  name: "浮蝶",
  wikiSlug: "浮蝶",
  wikiUrl: "https://wiki.biligame.com/ap/浮蝶",
  elements: [
    "光",
    "风"
  ],
  battleTag: "侵扰",
  race: "幻生类·精怪族",
  height: "55cm",
  stage: "成长期",
  sizeType: "小",
  shiny: true,
  special: false,
  obtain: "待补充",
  intro: "浮蝶由小浮蝶成长而来，心智以及对周围的认知比小浮蝶更加丰富，在生活过程中也产生了一定的领地意识，拥有简单的攻击手段。虽然没有什么危险性，但对于无故踏入自己领地的个体会采取恶作剧般的驱赶行为。",
  image: "/imgs/qibos/fudie.png",
  pixelImageUrl: "https://patchwiki.biligame.com/images/ap/6/6f/oe321madd11gwj0wdxphgg274kn8nyo.png",
  imageWidth: 768,
  imageHeight: 96,
  homeJobs: [
    "锻坚"
  ],
  drops: [
    "密文轮盘",
    "凝形晶核"
  ],
  skills: [
    {
      name: "浮蝶磷粉",
      maxLevel: 5,
      desc: "释放磷粉，增加全队角色与奇波7.8%的暴击率，持续15秒。",
      levels: [
        {
          level: 1,
          desc: "释放磷粉，增加全队角色与奇波4.7%的暴击率，持续15秒。"
        },
        {
          level: 2,
          desc: "释放磷粉，增加全队角色与奇波5.5%的暴击率，持续15秒。"
        },
        {
          level: 3,
          desc: "释放磷粉，增加全队角色与奇波6.3%的暴击率，持续15秒。"
        },
        {
          level: 4,
          desc: "释放磷粉，增加全队角色与奇波7.1%的暴击率，持续15秒。"
        },
        {
          level: 5,
          desc: "释放磷粉，增加全队角色与奇波7.8%的暴击率，持续15秒。"
        }
      ]
    },
    {
      name: "小风弹",
      maxLevel: 5,
      desc: "向目标连续发射3枚小风弹，每枚风弹对命中的敌人造成23.8%攻击力的风属性伤害。",
      levels: [
        {
          level: 1,
          desc: "向目标连续发射3枚小风弹，每枚风弹对命中的敌人造成9.1%攻击力的风属性伤害。"
        },
        {
          level: 2,
          desc: "向目标连续发射3枚小风弹，每枚风弹对命中的敌人造成12.8%攻击力的风属性伤害。"
        },
        {
          level: 3,
          desc: "向目标连续发射3枚小风弹，每枚风弹对命中的敌人造成16.5%攻击力的风属性伤害。"
        },
        {
          level: 4,
          desc: "向目标连续发射3枚小风弹，每枚风弹对命中的敌人造成20.1%攻击力的风属性伤害。"
        },
        {
          level: 5,
          desc: "向目标连续发射3枚小风弹，每枚风弹对命中的敌人造成23.8%攻击力的风属性伤害。"
        }
      ]
    },
    {
      name: "浮蝶-合击",
      maxLevel: 5,
      desc: "向目标发起攻击，造成652.9%攻击力的风属性伤害，对架势槽造成大量伤害。",
      levels: [
        {
          level: 1,
          desc: "向目标发起攻击，造成251.1%攻击力的风属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 2,
          desc: "向目标发起攻击，造成351.6%攻击力的风属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 3,
          desc: "向目标发起攻击，造成452%攻击力的风属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 4,
          desc: "向目标发起攻击，造成552.5%攻击力的风属性伤害，对架势槽造成大量伤害。"
        },
        {
          level: 5,
          desc: "向目标发起攻击，造成652.9%攻击力的风属性伤害，对架势槽造成大量伤害。"
        }
      ]
    }
  ],
  properties: [
    {
      name: "活性鳞粉",
      desc: "释放特技后，奇波和搭档角色攻击力上升2%，最多叠加6层，持续30秒。"
    },
    {
      name: "轻灵Ⅱ",
      desc: "奇波对决中，自身生命值降低30%，施放特技时，友方全体奇波移动速度提升40%，持续7秒。"
    }
  ],
  evolutions: [
    {
      name: "小浮蝶",
      no: 162,
      stage: "幼年期",
      wikiSlug: "小浮蝶"
    },
    {
      name: "浮蝶",
      no: 163,
      stage: "成长期",
      wikiSlug: "浮蝶"
    },
    {
      name: "幻蝶",
      no: 164,
      stage: "成熟期",
      wikiSlug: "幻蝶"
    },
    {
      name: "森彩灵蝶",
      no: 165,
      stage: "超限体",
      wikiSlug: "森彩灵蝶"
    }
  ]
}
