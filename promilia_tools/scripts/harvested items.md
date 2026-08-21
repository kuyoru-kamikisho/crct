## 需求1

创建一个nodejs爬虫脚本

爬取页面1：https://wiki.biligame.com/ap/%E7%89%A9%E5%93%81%E4%B8%80%E8%A7%88
爬取元素 `id="CardSelectTr"` 下的所有子元素，一个子元素代表一个物品。
子元素可能是以下内容：

```html
<div class="divsort ap-common_item-child r5星 f" data-param0="0" data-param1="5星" data-param2="牵绊礼物, 角色礼物"><img alt="Tex icon item gift 09.png" src="https://patchwiki.biligame.com/images/ap/thumb/d/d6/7yqqrsf6lq9m466dxqb62ik2quehybs.png/100px-Tex_icon_item_gift_09.png" decoding="async" loading="lazy" width="100" height="100" class="common_item-img" srcset="https://patchwiki.biligame.com/images/ap/thumb/d/d6/7yqqrsf6lq9m466dxqb62ik2quehybs.png/150px-Tex_icon_item_gift_09.png 1.5x, https://patchwiki.biligame.com/images/ap/thumb/d/d6/7yqqrsf6lq9m466dxqb62ik2quehybs.png/200px-Tex_icon_item_gift_09.png 2x" data-file-width="252" data-file-height="252"><span class="common_item-name">水晶饰品套装</span><a href="/ap/水晶饰品套装"></a></div>
```

子元素中的 `<a href="/ap/桌上游戏组合"></a>` 代表物品的详情页链接

进入详情页链接后页面里可能会有下面这样的元素，代表物品的标签、获取途径、描述、作用
```html
<div class="common_item-tag">灵子突破</div>
<div class="common_item-waydesc">栗栗种子铺购买</div>
<div class="common_item-waydesc">呱呱的奇波小铺购买</div>

<div class="common_item-desc">镜铁矿打造的斧头，持有后可进行伐木。</div>
<div class="common_item-spdesc">镜铁矿打造的斧头，持有后可进行伐木。<br>斧头由镜铁矿制成，斧刃光洁如镜。虽然稍有些沉重，但劈砍时更具破坏力。</div>

<div class="common_item-desc common_item-food"><div>奇波饱腹值+30</div><div>角色饱腹值+40</div><div>食用后使攻击提升275点，持续300s</div></div>
```


此爬虫脚本具备以下功能：

1. 在第一级页面爬取所有物品及其基础信息，包括星级、图片，图片需要保存下来
2. 通过第二级页面里额外爬取物品标签、获取途径、作用、描述语，对爬取到的所有物品按照【获取途径】进行分类，如果有的物品没有代表获取途径的`<div class="common_item-waydesc">`元素，则这些物品的类别默认为“物品图鉴”

## 需求2

1. 扩充页面的侧边栏
上面的脚本已经按照上面的【获取途径】完成分类，现在根据类别，追加或者扩充页面的侧边栏，比如栗栗种子铺、呱呱的奇波小铺（已有的图鉴名称是项目初创时的临时名称，根据实际情况灵活修改，甚至可以删除完全用不到的侧边栏图鉴），现在项目已经做完角色和奇波图鉴，接着按上面的获取途径往下追加。

2. 根据已创建的侧边栏项目创建对应的物品列表页，物品列表页需要有物品的名称、图片、星级，以及搜索框、筛选器。同一个物品如果有多种获取方式，比如物品A既可以通过栗栗种子铺获得，也可以通过呱呱的奇波小铺获得，那么在两个分类列表页里都会展示出这个商品

3. 在物品列表页里，点击物品应当跳转对应的物品详情页，详情页展示物品全部信息

## 需求3

样式优美交互友好，优化seo，优化站内搜索使其能够搜索刀新添加的页面内容