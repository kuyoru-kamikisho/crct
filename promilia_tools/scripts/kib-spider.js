写一个nodejs网页数据爬取脚本，从biwiki中爬取奇波数据
第一个页面：https://wiki.biligame.com/ap/%E5%A5%87%E6%B3%A2%E4%B8%80%E8%A7%88

通过 const qibos = document.querySelectorAll('.divsort.ap-kibo-child') 可以获取到页面上所有奇波dom
其中 qibos[0] 是下面这样的内容：
```html
<div class="divsort ap-kibo-child" data-e1="木" data-e2="" data-param0="0" data-param1="木" data-param2="空" data-param3="异生类·兽形族" data-param4="成长期" data-param5="小" data-param6="无" data-param7="否"><img alt="Tex icon pet 500259.png" src="https://patchwiki.biligame.com/images/ap/thumb/6/69/6dvjdrabx5wb204v8zi2geaf3mrcs60.png/100px-Tex_icon_pet_500259.png" decoding="async" loading="lazy" width="100" height="100" class="kibo-img" srcset="https://patchwiki.biligame.com/images/ap/thumb/6/69/6dvjdrabx5wb204v8zi2geaf3mrcs60.png/150px-Tex_icon_pet_500259.png 1.5x, https://patchwiki.biligame.com/images/ap/thumb/6/69/6dvjdrabx5wb204v8zi2geaf3mrcs60.png/200px-Tex_icon_pet_500259.png 2x" data-file-width="336" data-file-height="336"><span class="kibo-name">蓬尾狐</span><span class="kibo-number">NO.2</span><a href="/ap/蓬尾狐"></a></div>
```
通过上面的内容可以获取到奇波的名称、详情页链接`/ap/蓬尾狐`、元素、类型等信息

随后，根据详情页链接进入详情页，抓取必要的信息。
详情dom：
```html
<div class="kibo-box ap-w100">
<div id="bread"><a href="/ap/%E9%A6%96%E9%A1%B5" title="首页">首页</a>/<a href="/ap/%E5%A5%87%E6%B3%A2%E4%B8%80%E8%A7%88" title="奇波一览">奇波一览</a>/<a class="mw-selflink selflink">小芽狐</a></div>


<h2 style="color:#fff;margin:0;"><span id=".E4.BF.A1.E6.81.AF"></span><span class="mw-headline" id="信息">信息</span></h2>
<div class="kibo-box-nav">
<ul class="nav ap-nav sp-nav">
<li data-toggle="tab" data-target=".kibo-tab-normall" class="active">普通</li></ul><ul class="nav ap-nav shine-nav" style="display: none;">
<style type="text/css"> </style><li class="kibo-shine-button" onclick="$(this).toggleClass('active'); $('.kibo-card,.kibo-pixel-box').toggleClass('kibo-shine')">闪光</li><style>></style>
</ul>
</div>
<div class="kibo-card-box">
<div class="kibo-card">
<div class="tab-content"><img alt="Tex pet kibo card background 500258.png" src="https://patchwiki.biligame.com/images/ap/c/c7/tw1tt3gouzm3f3whfxg9vj591nys20h.png" decoding="async" loading="lazy" width="492" height="592" class="kibo-back-img tab-pane kibo-tab-normall active" data-file-width="492" data-file-height="592">
</div>
<div class="kibo-frame"><img alt="Tex pet card element 4.png" src="https://patchwiki.biligame.com/images/ap/3/3f/lqcmmii3jmqfd362ru1ugz1s8tau992.png" decoding="async" loading="lazy" width="312" height="524" class="kibo-eleback-img" data-file-width="312" data-file-height="524"><img alt="Tex pet card shining.png" src="https://patchwiki.biligame.com/images/ap/d/d1/0tjt19n6ls4sgtwpia7d9f5d268ddg9.png" decoding="async" loading="lazy" width="312" height="524" class="kibo-eleback-img kibo-back-shine-img" data-file-width="312" data-file-height="524">
</div>
<div class="kibo-fore tab-content"><img alt="Tex pet kibo card foreground 500258.png" src="https://patchwiki.biligame.com/images/ap/b/bd/iyx8sbxlvjkg2ifexj72hae2q4yz9su.png" decoding="async" loading="lazy" width="916" height="752" class="kibo-fore-img tab-pane kibo-tab-normall active" data-file-width="916" data-file-height="752"><img alt="Tex pet kibo card kibo 500258.png" src="https://patchwiki.biligame.com/images/ap/8/8a/qwrkzao5mnl8649wcssw5haedo8aa34.png" decoding="async" loading="lazy" width="916" height="752" class="kibo-card-img tab-pane kibo-tab-normall active" data-file-width="916" data-file-height="752"></div>
<div class="kibo-frame"><span><img alt="Tex pet card element tap 4.png" src="https://patchwiki.biligame.com/images/ap/a/af/4vmbb7rpm90xeb8zki7u9noe1u6wulo.png" decoding="async" loading="lazy" width="56" height="56" class="kibo-eletap-img" data-file-width="56" data-file-height="56"></span><span><img alt="Tex battle icon mu.png" src="https://patchwiki.biligame.com/images/ap/0/02/f14n5fx0lk9sxowt3v07bbumcp61nu2.png" decoding="async" loading="lazy" width="50" height="50" class="kibo-ele-img" data-file-width="50" data-file-height="50"></span>
</div>
<div class="kibo-shine-star"><img alt="Tex pet card shining glow1.png" src="https://patchwiki.biligame.com/images/ap/9/91/n9mzx7mrfmbax2gm5naar9fhy8gjjs1.png" decoding="async" loading="lazy" width="149" height="153" data-file-width="149" data-file-height="153"><img alt="Tex pet card shining glow2.png" src="https://patchwiki.biligame.com/images/ap/1/1a/6f07y8axq4z6u5swf9ip48tfrjv7wjt.png" decoding="async" loading="lazy" width="93" height="74" data-file-width="93" data-file-height="74"><img alt="Tex pet card shining glow3.png" src="https://patchwiki.biligame.com/images/ap/f/f4/ky0ehj0h9ll3yjy9gb75ww00de3oq3o.png" decoding="async" loading="lazy" width="57" height="54" data-file-width="57" data-file-height="54"></div>
</div>
</div>
<div class="kibo-info-box">
<div class="kibo-info" style="display: flex;align-items: center;position: relative;"><span class="kibo-element-box"><img alt="Tex icon petelem wood.png" src="https://patchwiki.biligame.com/images/ap/8/8d/t1nq0pkgu0cy1eix96gbjmpf0wgd6r9.png" decoding="async" loading="lazy" width="50" height="50" class="kibo-element-img" data-file-width="50" data-file-height="50"></span><span class="kibo-battle-tag-box"><img alt="Tex battle tag kibo 8.png" src="https://patchwiki.biligame.com/images/ap/2/2a/kb5do3sz4vd71u8bstmcn96cso23sq6.png" decoding="async" loading="lazy" width="30" height="30" class="kibo-battle-img" data-file-width="30" data-file-height="30">侵扰</span><span class="kibo-number-box tab-content"><span style="font-size: 0.75em;">NO.</span><span class="kibo-bnumber">1</span><span class="tab-pane kibo-tab-normall"></span></span><div class="kibo-pixel-box"><img alt="Tex bg pixelbase t1.png" src="https://patchwiki.biligame.com/images/ap/5/53/d1bd1tofm8lj52xz64vsfgldaks8s3o.png" decoding="async" loading="lazy" width="96" height="64" class="kibo-pixelbase" data-file-width="96" data-file-height="64"><div class="animation kibo-pixel tab-content"><img alt="Tex icon pet 500258 sprite.png" src="https://patchwiki.biligame.com/images/ap/9/97/fncrqhuvwbwnnv9135l2t0y8hkuaij8.png" decoding="async" loading="lazy" width="768" height="96" class="kibo-pixelimg tab-pane kibo-tab-normall active" data-file-width="768" data-file-height="96"></div></div>
</div>
<div class="kibo-info tab-content"><div class="tab-pane kibo-tab-normall kibo-name active">小芽狐</div>
</div>
<div class="kibo-dec">小芽狐活泼好动，跳跃力强，能轻松跳到比它高两三倍的地方，平时走路也总是蹦蹦跳跳的，十分灵动。<br>由于过于好动，小芽狐也常常出现翻车的情况——跳进一个坑里卡住出不来了。</div>
<div class="kibo-label-box">
<div class="kibo-label">元素：<span class="kibo-element">木</span></div>
<div class="kibo-label">标签：<span class="kibo-battle-tag">侵扰</span></div>
<div class="kibo-label">种族：<span class="kibo-race">异生类·兽形族</span></div>
<div class="kibo-label">身高：<span class="kibo-size">65cm</span></div>
<div class="kibo-label">阶段：<span class="kibo-pet-stage">幼年期</span></div>
<div class="kibo-label">体型：<span class="kibo-size-type">小</span></div>
</div>
</div>
</div>
```
技能信息dom：
```html
<div class="kibo-skill-box">
<h2><span id=".E6.8A.80.E8.83.BD"></span><span class="mw-headline" id="技能">技能</span></h2>
<div class="kibo-skill">
<div class="apskill skill-box" data-max-level="5">
<div class="skill-gif"><div class="ap-lowload" data-filename="小芽狐-芽之息" data-src="" title="小芽狐-芽之息"><div style="display:none;"></div><div class="ap-lowload-text">技能预览gif占位</div></div></div>
<div class="kibo-skill-img" style="background-color: #5dca95"><img alt="Tex icon petskill 500260 01.png" src="https://patchwiki.biligame.com/images/ap/e/e5/rvwln4tk8c54w06xfubkovev3nmcrj4.png" decoding="async" loading="lazy" width="132" height="132" data-file-width="132" data-file-height="132"></div>
<div class="skill-content"><div class="skill-info"><span class="skill-name">芽之息</span><div class="apskill-level-dropdown"><div class="apskill-dropdown-list"><span data-level="1">Lv.1</span><span data-level="2">Lv.2</span><span data-level="3">Lv.3</span><span data-level="4">Lv.4</span><span data-level="5">Lv.5</span></div><span class="apskill-dropdown-toggle skill-level">Lv.<span>5</span></span></div></div><div class="apskill-level-selector"><div class="apskill-slider"><div class="apskill-slider-track"></div><div class="apskill-slider-fill"></div><div class="apskill-slider-thumb"></div></div></div><div class="apskill-desc skill-desc">唤出木能光束，对目标敌人区域造成三次164.3%攻击力的<span style="color:#3ea070;">木属性伤害</span>。<br>为队伍添加1枚木属性调谐印记。</div><div class="apskill-data" style="display:none;"><div data-level="1">唤出木能光束，对目标敌人区域造成三次63.2%攻击力的<span style="color:#3ea070;">木属性伤害</span>。<br>为队伍添加1枚木属性调谐印记。</div><div data-level="2">唤出木能光束，对目标敌人区域造成三次88.5%攻击力的<span style="color:#3ea070;">木属性伤害</span>。<br>为队伍添加1枚木属性调谐印记。</div><div data-level="3">唤出木能光束，对目标敌人区域造成三次113.8%攻击力的<span style="color:#3ea070;">木属性伤害</span>。<br>为队伍添加1枚木属性调谐印记。</div><div data-level="4">唤出木能光束，对目标敌人区域造成三次139%攻击力的<span style="color:#3ea070;">木属性伤害</span>。<br>为队伍添加1枚木属性调谐印记。</div><div data-level="5">唤出木能光束，对目标敌人区域造成三次164.3%攻击力的<span style="color:#3ea070;">木属性伤害</span>。<br>为队伍添加1枚木属性调谐印记。</div></div>
</div>
</div><div class="apskill skill-box" data-max-level="5">
<div class="skill-gif"><div class="ap-lowload" data-filename="小芽狐-灵木弹" data-src="" title="小芽狐-灵木弹"><div style="display:none;"></div><div class="ap-lowload-text">技能预览gif占位</div></div></div>
<div class="kibo-skill-img" style="background-color: #5dca95"><img alt="Tex icon petskill 505001.png" src="https://patchwiki.biligame.com/images/ap/5/54/ffz2624bypkr4hcii09dpj763zu0xgd.png" decoding="async" loading="lazy" width="132" height="132" data-file-width="132" data-file-height="132"></div>
<div class="skill-content"><div class="skill-info"><span class="skill-name">灵木弹</span><div class="apskill-level-dropdown"><div class="apskill-dropdown-list"><span data-level="1">Lv.1</span><span data-level="2">Lv.2</span><span data-level="3">Lv.3</span><span data-level="4">Lv.4</span><span data-level="5">Lv.5</span></div><span class="apskill-dropdown-toggle skill-level">Lv.<span>5</span></span></div></div><div class="apskill-level-selector"><div class="apskill-slider"><div class="apskill-slider-track"></div><div class="apskill-slider-fill"></div><div class="apskill-slider-thumb"></div></div></div><div class="apskill-desc skill-desc">向目标发射3枚灵木弹，对命中的敌人造成23.8%攻击力的<span style="color:#3ea070;">木属性伤害</span>。</div><div class="apskill-data" style="display:none;"><div data-level="1">向目标发射3枚灵木弹，对命中的敌人造成9.1%攻击力的<span style="color:#3ea070;">木属性伤害</span>。</div><div data-level="2">向目标发射3枚灵木弹，对命中的敌人造成12.8%攻击力的<span style="color:#3ea070;">木属性伤害</span>。</div><div data-level="3">向目标发射3枚灵木弹，对命中的敌人造成16.5%攻击力的<span style="color:#3ea070;">木属性伤害</span>。</div><div data-level="4">向目标发射3枚灵木弹，对命中的敌人造成20.1%攻击力的<span style="color:#3ea070;">木属性伤害</span>。</div><div data-level="5">向目标发射3枚灵木弹，对命中的敌人造成23.8%攻击力的<span style="color:#3ea070;">木属性伤害</span>。</div></div>
</div>
</div>
<div class="apskill skill-box" data-max-level="5">
<div class="skill-gif"><div class="ap-lowload" data-filename="小芽狐-小芽狐-合击" data-src="" title="小芽狐-小芽狐-合击"><div style="display:none;"></div><div class="ap-lowload-text">技能预览gif占位</div></div></div>
<div class="kibo-skill-img" style="background-color: #5dca95"><img alt="Tex icon skill petbreakatk.png" src="https://patchwiki.biligame.com/images/ap/d/d9/97c5ew674wup2el7tvra1aat2siev0g.png" decoding="async" loading="lazy" width="132" height="132" data-file-width="132" data-file-height="132"></div>
<div class="skill-content"><div class="skill-info"><span class="skill-name">小芽狐-合击</span><div class="apskill-level-dropdown"><div class="apskill-dropdown-list"><span data-level="1">Lv.1</span><span data-level="2">Lv.2</span><span data-level="3">Lv.3</span><span data-level="4">Lv.4</span><span data-level="5">Lv.5</span></div><span class="apskill-dropdown-toggle skill-level">Lv.<span>5</span></span></div></div><div class="apskill-level-selector"><div class="apskill-slider"><div class="apskill-slider-track"></div><div class="apskill-slider-fill"></div><div class="apskill-slider-thumb"></div></div></div><div class="apskill-desc skill-desc">向目标发起攻击，造成652.9%攻击力的<span style="color:#3ea070;">木属性伤害</span>，对架势槽造成大量伤害。</div><div class="apskill-data" style="display:none;"><div data-level="1">向目标发起攻击，造成251.1%攻击力的<span style="color:#3ea070;">木属性伤害</span>，对架势槽造成大量伤害。</div><div data-level="2">向目标发起攻击，造成351.6%攻击力的<span style="color:#3ea070;">木属性伤害</span>，对架势槽造成大量伤害。</div><div data-level="3">向目标发起攻击，造成452%攻击力的<span style="color:#3ea070;">木属性伤害</span>，对架势槽造成大量伤害。</div><div data-level="4">向目标发起攻击，造成552.5%攻击力的<span style="color:#3ea070;">木属性伤害</span>，对架势槽造成大量伤害。</div><div data-level="5">向目标发起攻击，造成652.9%攻击力的<span style="color:#3ea070;">木属性伤害</span>，对架势槽造成大量伤害。</div></div>
</div>
</div>
<div class="skill-property-box"><div class="property-box"><div class="property-name">茂盛花木</div><div class="property-desc">奇波和搭档角色的木属性伤害增加12%。</div></div><div class="property-box"><div class="property-name">萝冠Ⅰ</div><div class="property-desc">奇波对决中，自身特技冷却时间缩短50%，特技伤害降低40%。</div></div></div>
</div>
</div>

```