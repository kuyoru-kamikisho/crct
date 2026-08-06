# 背景与场景绘制

export class WorldRenderer
  constructor: ->
    @time = 0
    @decor = []

  prepare: (terrain, length, worldW) ->
    @terrain = terrain
    @length = length
    @worldW = worldW
    @decor = []
    y = 0
    while y < length + 800
      side = if Math.random() < 0.5 then -1 else 1
      @decor.push
        x: if side < 0 then rand(10, worldW * 0.12) else rand(worldW * 0.88, worldW - 10)
        y: y
        kind: pick ['pine', 'rock', 'bush', 'flag']
        scale: rand 0.7, 1.3
      y += rand 40, 110

  update: (dt) ->
    @time += dt

  drawBackground: (ctx, w, h, camY, speed) ->
    t = @terrain
    sky = ctx.createLinearGradient 0, 0, 0, h
    sky.addColorStop 0, t.sky[0]
    sky.addColorStop 0.55, t.sky[1]
    sky.addColorStop 1, t.sky[2]
    ctx.fillStyle = sky
    ctx.fillRect 0, 0, w, h

    # 远山
    @drawMountains ctx, w, h, camY, t

    # 雪道地面带
    ground = ctx.createLinearGradient 0, 0, 0, h
    ground.addColorStop 0, t.ground[0]
    ground.addColorStop 0.5, t.ground[1]
    ground.addColorStop 1, t.ground[2]
    ctx.fillStyle = ground
    margin = w * 0.06
    ctx.beginPath()
    ctx.moveTo margin, 0
    # 轻微的雪道边缘
    steps = 16
    for i in [0..steps]
      py = (i / steps) * h
      wobble = Math.sin((camY + py) * 0.01 + @time) * 8
      ctx.lineTo margin + wobble, py
    ctx.lineTo w - margin, h
    for i in [steps..0]
      py = (i / steps) * h
      wobble = Math.sin((camY + py) * 0.012 + 2 + @time) * 8
      ctx.lineTo w - margin + wobble, py
    ctx.closePath()
    ctx.fill()

    # 雪道纹理条纹
    ctx.save()
    ctx.globalAlpha = if t.id is 'night' or t.id is 'volcano' then 0.08 else 0.12
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    y = -((camY * 0.5) % 40)
    while y < h + 40
      ctx.beginPath()
      ctx.moveTo margin + 20, y
      ctx.lineTo w - margin - 20, y + 10
      ctx.stroke()
      y += 40
    ctx.restore()

    # 极夜星空
    if t.id is 'night'
      ctx.fillStyle = '#fff'
      for i in [0...40]
        sx = (i * 97 + camY * 0.02) % w
        sy = (i * 53) % (h * 0.55)
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs Math.sin(@time + i)
        ctx.fillRect sx, sy, 2, 2
      ctx.globalAlpha = 1

    # 火山火星
    if t.id is 'volcano'
      for i in [0...12]
        fx = (i * 73 + @time * 30) % w
        fy = h - ((@time * 40 + i * 50) % h)
        ctx.fillStyle = "rgba(255,138,76,#{0.4 + 0.4 * Math.sin(@time * 5 + i)})"
        ctx.beginPath()
        ctx.arc fx, fy, 2 + (i % 3), 0, Math.PI * 2
        ctx.fill()

  drawMountains: (ctx, w, h, camY, t) ->
    ctx.save()
    parallax = camY * 0.15
    layers = [
      { alpha: 0.35, y: h * 0.35, amp: 40, color: shade(t.sky[0], -20) }
      { alpha: 0.5, y: h * 0.45, amp: 55, color: shade(t.sky[1], -30) }
    ]
    for layer, li in layers
      ctx.globalAlpha = layer.alpha
      ctx.fillStyle = layer.color
      ctx.beginPath()
      ctx.moveTo 0, h
      ctx.lineTo 0, layer.y
      for i in [0..12]
        px = (i / 12) * w
        py = layer.y - Math.abs(Math.sin(i * 1.7 + li + parallax * 0.01)) * layer.amp - (i % 3) * 10
        ctx.lineTo px, py
      ctx.lineTo w, h
      ctx.closePath()
      ctx.fill()
      # 山顶雪
      if t.id isnt 'volcano'
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.beginPath()
        for i in [0..12]
          px = (i / 12) * w
          peak = layer.y - Math.abs(Math.sin(i * 1.7 + li + parallax * 0.01)) * layer.amp - (i % 3) * 10
          if i is 0
            ctx.moveTo px, peak
          else
            ctx.lineTo px, peak
        ctx.lineTo w, layer.y + 20
        ctx.lineTo 0, layer.y + 20
        ctx.closePath()
        ctx.fill()
    ctx.restore()

  drawDecor: (ctx, camY, h) ->
    for d in @decor
      y = d.y - camY
      continue if y < -80 or y > h + 80
      ctx.save()
      ctx.translate d.x, y
      ctx.scale d.scale, d.scale
      switch d.kind
        when 'pine'
          ctx.fillStyle = @terrain.treeColor
          ctx.beginPath()
          ctx.moveTo 0, -50
          ctx.lineTo 16, -10
          ctx.lineTo -16, -10
          ctx.fill()
          ctx.fillStyle = '#5a3a22'
          ctx.fillRect -3, -10, 6, 12
        when 'rock'
          ctx.fillStyle = @terrain.rockColor
          ctx.beginPath()
          ctx.moveTo -12, 0
          ctx.lineTo -6, -16
          ctx.lineTo 10, -10
          ctx.lineTo 14, 0
          ctx.fill()
        when 'bush'
          ctx.fillStyle = shade(@terrain.treeColor, 30)
          ctx.beginPath()
          ctx.arc -6, -6, 8, 0, Math.PI * 2
          ctx.arc 6, -6, 8, 0, Math.PI * 2
          ctx.arc 0, -12, 7, 0, Math.PI * 2
          ctx.fill()
        when 'flag'
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo 0, 0
          ctx.lineTo 0, -28
          ctx.stroke()
          ctx.fillStyle = @terrain.accent
          ctx.beginPath()
          ctx.moveTo 0, -28
          ctx.lineTo 14, -22
          ctx.lineTo 0, -16
          ctx.fill()
      ctx.restore()

  drawVignette: (ctx, w, h) ->
    g = ctx.createRadialGradient w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85
    g.addColorStop 0, 'rgba(0,0,0,0)'
    g.addColorStop 1, 'rgba(0,0,0,0.35)'
    ctx.fillStyle = g
    ctx.fillRect 0, 0, w, h

rand = (a, b) -> a + Math.random() * (b - a)
pick = (arr) -> arr[Math.floor Math.random() * arr.length]

shade = (hex, amt) ->
  hex = hex.replace '#', ''
  num = parseInt hex, 16
  r = Math.max 0, Math.min 255, (num >> 16) + amt
  g = Math.max 0, Math.min 255, ((num >> 8) & 0xff) + amt
  b = Math.max 0, Math.min 255, (num & 0xff) + amt
  "##{((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}"
