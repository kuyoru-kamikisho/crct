# 障碍、收集物、敌人实体

rand = (a, b) -> a + Math.random() * (b - a)
pick = (arr) -> arr[Math.floor Math.random() * arr.length]

export class Entity
  constructor: (opts) ->
    @type = opts.type
    @x = opts.x
    @y = opts.y
    @w = opts.w ? 30
    @h = opts.h ? 30
    @vx = opts.vx ? 0
    @vy = opts.vy ? 0
    @alive = true
    @value = opts.value ? 0
    @subtype = opts.subtype ? ''
    @phase = Math.random() * Math.PI * 2
    @rot = 0

  bounds: ->
    { x: @x - @w / 2, y: @y - @h, w: @w, h: @h }

export hitTest = (a, b) ->
  a.x < b.x + b.w and a.x + a.w > b.x and a.y < b.y + b.h and a.y + a.h > b.y

export class Spawner
  constructor: (@level, @difficulty, @worldW) ->
    @cursor = 200
    @finishY = @level.length
    @entities = []
    @spawnedFinish = false

  reset: ->
    @cursor = 200
    @entities = []
    @spawnedFinish = false

  update: (playerY, camBottom) ->
    target = Math.max playerY + 900, camBottom + 200
    density = @level.density * @difficulty.spawnMul

    while @cursor < target and @cursor < @finishY - 120
      gap = rand(70, 140) / density
      @cursor += gap
      @spawnAt @cursor

    if not @spawnedFinish and @cursor >= @finishY - 120
      @spawnedFinish = true
      @entities.push new Entity
        type: 'finish'
        x: @worldW / 2
        y: @finishY
        w: @worldW * 0.85
        h: 40

    # 清理身后实体
    @entities = @entities.filter (e) -> e.alive and e.y > playerY - 200

  spawnAt: (y) ->
    roll = Math.random()
    lanes = [@worldW * 0.18, @worldW * 0.35, @worldW * 0.5, @worldW * 0.65, @worldW * 0.82]
    x = pick lanes
    x += rand -20, 20

    if roll < @level.coinRate * 0.55
      @spawnCoins y, x
    else if roll < @level.coinRate * 0.55 + @level.powerRate
      @spawnPower y, x
    else if roll < @level.coinRate * 0.55 + @level.powerRate + @level.enemyRate
      @spawnEnemy y, x
    else
      @spawnObstacle y, x

    # 偶尔并排障碍
    if Math.random() < 0.25 * @difficulty.spawnMul
      x2 = pick lanes.filter (l) -> Math.abs(l - x) > 60
      @spawnObstacle y + rand(10, 40), x2 if x2?

  spawnCoins: (y, x) ->
    pattern = pick ['line', 'arc', 'cluster']
    count = if pattern is 'cluster' then 5 else 6
    for i in [0...count]
      ox = 0
      oy = i * 36
      if pattern is 'arc'
        ox = Math.sin(i * 0.8) * 50
      else if pattern is 'cluster'
        ox = rand -40, 40
        oy = rand 0, 50
      gem = Math.random() < 0.12
      @entities.push new Entity
        type: if gem then 'gem' else 'coin'
        x: x + ox
        y: y + oy
        w: if gem then 22 else 18
        h: if gem then 22 else 18
        value: if gem then 50 else 10

  spawnPower: (y, x) ->
    subtype = pick ['shield', 'magnet', 'boost', 'heart']
    @entities.push new Entity
      type: 'power'
      subtype: subtype
      x: x
      y: y
      w: 28
      h: 28
      value: 0

  spawnObstacle: (y, x) ->
    kind = pick ['rock', 'tree', 'snowman', 'iceblock', 'log']
    sizes =
      rock: [36, 28]
      tree: [34, 56]
      snowman: [30, 42]
      iceblock: [40, 34]
      log: [54, 18]
    [w, h] = sizes[kind]
    @entities.push new Entity
      type: 'obstacle'
      subtype: kind
      x: x
      y: y
      w: w
      h: h

  spawnEnemy: (y, x) ->
    subtype = pick ['yeti', 'penguin', 'drone']
    @entities.push new Entity
      type: 'enemy'
      subtype: subtype
      x: x
      y: y
      w: 34
      h: 40
      vx: if subtype is 'penguin' then pick([-80, 80]) else if subtype is 'drone' then 60 else 0

  updateEntities: (dt, worldW) ->
    for e in @entities
      continue unless e.alive
      e.phase += dt * 4
      e.rot += dt
      if e.type is 'enemy'
        if e.subtype is 'penguin'
          e.x += e.vx * dt
          if e.x < 40 or e.x > worldW - 40
            e.vx *= -1
        else if e.subtype is 'drone'
          e.x += Math.sin(e.phase) * 90 * dt
          e.y += Math.cos(e.phase * 0.5) * 20 * dt
        else if e.subtype is 'yeti'
          e.x += Math.sin(e.phase * 0.7) * 40 * dt

export drawEntity = (ctx, e, camY, terrain, time) ->
  return unless e.alive
  x = e.x
  y = e.y - camY
  return if y < -80 or y > ctx.canvas.height + 80

  switch e.type
    when 'coin'
      ctx.save()
      ctx.translate x, y - 10
      ctx.rotate Math.sin(e.phase) * 0.3
      ctx.fillStyle = '#ffd56a'
      ctx.beginPath()
      ctx.arc 0, 0, 9, 0, Math.PI * 2
      ctx.fill()
      ctx.fillStyle = '#ffe9a8'
      ctx.beginPath()
      ctx.arc -2, -2, 3, 0, Math.PI * 2
      ctx.fill()
      ctx.restore()

    when 'gem'
      ctx.save()
      ctx.translate x, y - 12
      ctx.rotate e.rot * 0.5
      ctx.fillStyle = '#7fd4ff'
      ctx.beginPath()
      ctx.moveTo 0, -12
      ctx.lineTo 10, 0
      ctx.lineTo 0, 12
      ctx.lineTo -10, 0
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath()
      ctx.moveTo 0, -8
      ctx.lineTo 5, 0
      ctx.lineTo 0, 2
      ctx.closePath()
      ctx.fill()
      ctx.restore()

    when 'power'
      colors =
        shield: '#7fd4ff'
        magnet: '#c084fc'
        boost: '#ff8a4c'
        heart: '#ff5a6a'
      icons =
        shield: '🛡'
        magnet: '🧲'
        boost: '⚡'
        heart: '♥'
      ctx.save()
      bob = Math.sin(e.phase) * 4
      ctx.translate x, y - 14 + bob
      ctx.fillStyle = colors[e.subtype] or '#fff'
      ctx.globalAlpha = 0.25
      ctx.beginPath()
      ctx.arc 0, 0, 18, 0, Math.PI * 2
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc 0, 0, 12, 0, Math.PI * 2
      ctx.fill()
      ctx.fillStyle = '#062033'
      ctx.font = 'bold 12px Outfit, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      label = { shield: '盾', magnet: '磁', boost: '速', heart: '心' }[e.subtype]
      ctx.fillText label, 0, 1
      ctx.restore()

    when 'obstacle'
      drawObstacle ctx, e, x, y, terrain

    when 'enemy'
      drawEnemy ctx, e, x, y, time

    when 'finish'
      # 旗门
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect x - e.w / 2, y - 50, e.w, 8
      ctx.strokeStyle = '#ff5a6a'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo x - e.w / 2, y
      ctx.lineTo x - e.w / 2, y - 70
      ctx.moveTo x + e.w / 2, y
      ctx.lineTo x + e.w / 2, y - 70
      ctx.stroke()
      ctx.fillStyle = '#ff5a6a'
      ctx.fillRect x - e.w / 2, y - 70, 28, 18
      ctx.fillStyle = '#fff'
      ctx.fillRect x + e.w / 2 - 28, y - 70, 28, 18
      ctx.font = 'bold 18px ZCOOL KuaiLe, sans-serif'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText '终点', x, y - 80

drawObstacle = (ctx, e, x, y, terrain) ->
  switch e.subtype
    when 'tree'
      ctx.fillStyle = '#6b4423'
      ctx.fillRect x - 4, y - 20, 8, 20
      ctx.fillStyle = terrain.treeColor
      ctx.beginPath()
      ctx.moveTo x, y - e.h
      ctx.lineTo x + e.w / 2, y - 18
      ctx.lineTo x - e.w / 2, y - 18
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo x, y - e.h + 12
      ctx.lineTo x + e.w / 2 + 4, y - 8
      ctx.lineTo x - e.w / 2 - 4, y - 8
      ctx.closePath()
      ctx.fill()
    when 'rock'
      ctx.fillStyle = terrain.rockColor
      ctx.beginPath()
      ctx.moveTo x - e.w / 2, y
      ctx.lineTo x - e.w / 3, y - e.h
      ctx.lineTo x + e.w / 4, y - e.h * 0.7
      ctx.lineTo x + e.w / 2, y
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.beginPath()
      ctx.moveTo x - e.w / 4, y - e.h * 0.7
      ctx.lineTo x - e.w / 8, y - e.h * 0.95
      ctx.lineTo x + 4, y - e.h * 0.6
      ctx.closePath()
      ctx.fill()
    when 'snowman'
      ctx.fillStyle = '#f0f6fa'
      ctx.beginPath()
      ctx.arc x, y - 12, 14, 0, Math.PI * 2
      ctx.fill()
      ctx.beginPath()
      ctx.arc x, y - 30, 10, 0, Math.PI * 2
      ctx.fill()
      ctx.fillStyle = '#333'
      ctx.beginPath()
      ctx.arc x - 3, y - 32, 1.5, 0, Math.PI * 2
      ctx.arc x + 3, y - 32, 1.5, 0, Math.PI * 2
      ctx.fill()
      ctx.fillStyle = '#ff8a4c'
      ctx.beginPath()
      ctx.moveTo x, y - 30
      ctx.lineTo x + 8, y - 28
      ctx.lineTo x, y - 26
      ctx.fill()
    when 'iceblock'
      ctx.fillStyle = 'rgba(180, 230, 255, 0.75)'
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect x - e.w / 2, y - e.h, e.w, e.h, 6
      ctx.fill()
      ctx.stroke()
    when 'log'
      ctx.fillStyle = '#6b4423'
      ctx.beginPath()
      ctx.roundRect x - e.w / 2, y - e.h, e.w, e.h, 4
      ctx.fill()
      ctx.strokeStyle = '#4a2e18'
      ctx.lineWidth = 1
      for i in [1..3]
        lx = x - e.w / 2 + i * e.w / 4
        ctx.beginPath()
        ctx.moveTo lx, y - e.h + 2
        ctx.lineTo lx, y - 2
        ctx.stroke()

drawEnemy = (ctx, e, x, y, time) ->
  switch e.subtype
    when 'yeti'
      ctx.fillStyle = '#d8e4ec'
      ctx.beginPath()
      ctx.roundRect x - 16, y - 38, 32, 36, 10
      ctx.fill()
      ctx.fillStyle = '#333'
      ctx.beginPath()
      ctx.arc x - 6, y - 26, 2, 0, Math.PI * 2
      ctx.arc x + 6, y - 26, 2, 0, Math.PI * 2
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillRect x - 8, y - 18, 16, 6
    when 'penguin'
      ctx.fillStyle = '#1a1a22'
      ctx.beginPath()
      ctx.ellipse x, y - 18, 12, 18, 0, 0, Math.PI * 2
      ctx.fill()
      ctx.fillStyle = '#f5f5f5'
      ctx.beginPath()
      ctx.ellipse x, y - 14, 7, 10, 0, 0, Math.PI * 2
      ctx.fill()
      ctx.fillStyle = '#ff8a4c'
      ctx.beginPath()
      ctx.moveTo x, y - 22
      ctx.lineTo x + 8, y - 20
      ctx.lineTo x, y - 18
      ctx.fill()
    when 'drone'
      bob = Math.sin(time * 6 + e.phase) * 3
      ctx.fillStyle = '#5a6a7a'
      ctx.beginPath()
      ctx.roundRect x - 14, y - 22 + bob, 28, 12, 4
      ctx.fill()
      ctx.strokeStyle = 'rgba(127,212,255,0.7)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo x - 18, y - 28 + bob
      ctx.lineTo x - 8, y - 22 + bob
      ctx.moveTo x + 18, y - 28 + bob
      ctx.lineTo x + 8, y - 22 + bob
      ctx.stroke()
      ctx.fillStyle = '#ff5a6a'
      ctx.beginPath()
      ctx.arc x, y - 16 + bob, 3, 0, Math.PI * 2
      ctx.fill()
