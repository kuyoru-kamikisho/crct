# 主游戏循环与逻辑

import { Player } from './Player.coffee'
import { Spawner, hitTest, drawEntity } from './Entities.coffee'
import { ParticleSystem } from './Particles.coffee'
import { WorldRenderer } from './World.coffee'
import { TERRAINS } from './levels.coffee'

export class Game
  constructor: (canvas, input, sfx, onEvent) ->
    @canvas = canvas
    @ctx = canvas.getContext '2d'
    @input = input
    @sfx = sfx
    @onEvent = onEvent
    @player = new Player 0, 0
    @particles = new ParticleSystem()
    @world = new WorldRenderer()
    @running = false
    @paused = false
    @lastTs = 0
    @raf = null
    @resize()
    window.addEventListener 'resize', => @resize()

  resize: ->
    dpr = Math.min window.devicePixelRatio or 1, 2
    @w = window.innerWidth
    @h = window.innerHeight
    @canvas.width = @w * dpr
    @canvas.height = @h * dpr
    @canvas.style.width = "#{@w}px"
    @canvas.style.height = "#{@h}px"
    @ctx.setTransform dpr, 0, 0, dpr, 0, 0
    @worldW = Math.min @w, 520
    @offsetX = (@w - @worldW) / 2

  start: (level, difficulty) ->
    @level = level
    @difficulty = difficulty
    @terrain = TERRAINS[level.terrain]
    @distance = 0
    @score = 0
    @coins = 0
    @combo = 0
    @maxCombo = 0
    @comboTimer = 0
    @lives = difficulty.lives
    @speed = level.baseSpeed * difficulty.speedMul
    @baseSpeed = @speed
    @camY = -@h * 0.35
    @playerY = 0
    @finished = false
    @dead = false
    @time = 0
    @shake = 0
    @player.reset @worldW / 2, 0
    @particles.clear()
    @spawner = new Spawner level, difficulty, @worldW
    @spawner.reset()
    @world.prepare @terrain, level.length, @worldW
    @running = true
    @paused = false
    @lastTs = 0
    @input.reset()
    cancelAnimationFrame @raf if @raf
    @raf = requestAnimationFrame (ts) => @loop ts
    @onEvent? 'hud', @hudData()

  stop: ->
    @running = false
    cancelAnimationFrame @raf if @raf
    @raf = null

  pause: ->
    @paused = true

  resume: ->
    @paused = false
    @lastTs = 0
    @raf = requestAnimationFrame (ts) => @loop ts

  hudData: ->
    {
      score: Math.floor @score
      distance: Math.floor @distance
      lives: @lives
      maxLives: @difficulty.lives
      combo: @combo
      powers: @powerLabels()
    }

  powerLabels: ->
    list = []
    list.push '护盾' if @player.shield > 0
    list.push '磁铁' if @player.magnet > 0
    list.push '加速' if @player.boost > 0
    list

  loop: (ts) ->
    return unless @running
    if @paused
      @lastTs = 0
      return
    if not @lastTs
      @lastTs = ts
    dt = Math.min 0.033, (ts - @lastTs) / 1000
    @lastTs = ts
    @update dt
    @draw()
    @input.endFrame()
    @raf = requestAnimationFrame (t) => @loop t

  update: (dt) ->
    return if @finished or @dead
    @time += dt
    @shake = Math.max 0, @shake - dt

    if @input.pausePressed
      @onEvent? 'pause'
      return

    # 速度随距离与状态变化
    progress = @distance / @level.length
    @speed = @baseSpeed * (1 + progress * 0.35) * @terrain.boost
    @speed *= 1.35 if @player.boost > 0
    @speed *= 0.7 if @player.slow > 0
    @speed *= 1.12 if @player.ducking and @player.onGround

    @playerY += @speed * 60 * dt
    @distance = @playerY

    result = @player.update dt, @input, @terrain, @speed
    if result is 'trick_done'
      @addCombo 'trick'
      @sfx.trick()
      @particles.burst @player.x, @playerY + @player.y, @terrain.accent
      @onEvent? 'trick', @player.trickName
    else if result is 'trick_fail'
      @combo = 0
      @onEvent? 'trick_fail'

    if @input.jumpPressed and @player.jumping
      @sfx.jump()
      @particles.snowSpray @player.x, @playerY, @player.laneTilt

    # 边界
    margin = 36
    @player.x = Math.max margin, Math.min @worldW - margin, @player.x

    # 滑雪喷雪
    if @player.onGround and Math.random() < 0.4
      @particles.snowSpray @player.x, @playerY + 4, @player.vx * 0.002

    @camY = @playerY - @h * 0.38
    @spawner.update @playerY, @camY + @h
    @spawner.updateEntities dt, @worldW
    @world.update dt
    @particles.update dt
    @comboTimer = Math.max 0, @comboTimer - dt
    if @comboTimer <= 0 and @combo > 0
      @combo = 0
      @onEvent? 'hud', @hudData()

    @handleCollisions()
    @score += @speed * 8 * dt * @difficulty.scoreMul * (1 + @combo * 0.08)

    if @distance >= @level.length and not @finished
      @finish true

    @onEvent? 'hud', @hudData() if Math.floor(@time * 10) % 2 is 0

  handleCollisions: ->
    pb = @player.bounds()
    # 转换到世界坐标
    pb =
      x: pb.x
      y: @playerY + pb.y
      w: pb.w
      h: pb.h

    for e in @spawner.entities
      continue unless e.alive
      eb = e.bounds()

      # 磁铁吸引
      if @player.magnet > 0 and e.type in ['coin', 'gem']
        dx = @player.x - e.x
        dy = (@playerY + @player.y) - e.y
        dist = Math.sqrt dx * dx + dy * dy
        if dist < 160
          e.x += dx * 0.12
          e.y += dy * 0.12

      continue unless hitTest pb, eb

      switch e.type
        when 'coin', 'gem'
          e.alive = false
          @coins += if e.type is 'gem' then 5 else 1
          gain = e.value * (1 + @combo * 0.1) * @difficulty.scoreMul
          @score += gain
          @addCombo 'collect'
          @particles.sparkle e.x, e.y, if e.type is 'gem' then '#7fd4ff' else '#ffd56a'
          @particles.floatText e.x, e.y, "+#{Math.floor gain}", if e.type is 'gem' then '#7fd4ff' else '#ffd56a'
          if e.type is 'gem' then @sfx.gem() else @sfx.coin()

        when 'power'
          e.alive = false
          @applyPower e.subtype
          @particles.burst e.x, e.y, '#ffb088'
          @sfx.power()
          @particles.floatText e.x, e.y, @powerName(e.subtype), '#ffb088'

        when 'obstacle', 'enemy'
          @hitPlayer e

        when 'finish'
          @finish true unless @finished

  powerName: (sub) ->
    { shield: '护盾!', magnet: '磁铁!', boost: '加速!', heart: '生命+1' }[sub] or '道具'

  applyPower: (sub) ->
    switch sub
      when 'shield' then @player.shield = Math.max @player.shield, 8
      when 'magnet' then @player.magnet = Math.max @player.magnet, 7
      when 'boost' then @player.boost = Math.max @player.boost, 4.5
      when 'heart' then @lives = Math.min @difficulty.lives + 1, @lives + 1

  hitPlayer: (e) ->
    return if @player.invincible > 0
    if @player.shield > 0
      @player.shield = 0
      @player.invincible = 1.2
      e.alive = false if e.type is 'enemy'
      @particles.burst @player.x, @playerY, '#7fd4ff'
      @sfx.power()
      @shake = 0.25
      return

    damage = Math.ceil 1 * @difficulty.damageMul
    @lives -= damage
    @player.invincible = 1.5
    @player.hitFlash = 1.2
    @player.slow = 0.8
    @combo = 0
    @shake = 0.4
    @sfx.hit()
    @particles.burst @player.x, @playerY, '#ff5a6a'
    @onEvent? 'hud', @hudData()
    if @lives <= 0
      @finish false

  addCombo: (reason) ->
    @combo += 1
    @maxCombo = Math.max @maxCombo, @combo
    @comboTimer = 2.2
    if @combo >= 3
      @onEvent? 'combo', @combo

  finish: (won) ->
    @finished = true
    @dead = not won
    stars = 0
    if won
      stars = 1
      stars++ if @score > @level.length * 2
      stars++ if @lives >= Math.ceil(@difficulty.lives / 2) and @maxCombo >= 5
      @sfx.win()
    else
      @sfx.lose()
    @onEvent? 'result',
      won: won
      score: Math.floor @score
      distance: Math.floor Math.min @distance, @level.length
      coins: @coins
      combo: @maxCombo
      stars: stars
      levelId: @level.id

  draw: ->
    ctx = @ctx
    ctx.clearRect 0, 0, @w, @h

    shakeX = if @shake > 0 then (Math.random() - 0.5) * 12 * @shake else 0
    shakeY = if @shake > 0 then (Math.random() - 0.5) * 12 * @shake else 0

    ctx.save()
    ctx.translate shakeX, shakeY

    @world.drawBackground ctx, @w, @h, @camY, @speed

    # 居中游戏区
    ctx.save()
    ctx.translate @offsetX, 0

    # 侧边暗角带
    if @offsetX > 0
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      # drawn outside via full width bg already

    @world.drawDecor ctx, @camY, @h

    for e in @spawner.entities
      drawEntity ctx, e, @camY, @terrain, @time

    screenY = @playerY - @camY
    @player.draw ctx, screenY, @terrain
    @particles.draw ctx, @camY

    # 进度条
    @drawProgress ctx

    ctx.restore()
    @world.drawVignette ctx, @w, @h
    ctx.restore()

  drawProgress: (ctx) ->
    pct = Math.min 1, @distance / @level.length
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect 16, @h - 18, @worldW - 32, 6
    g = ctx.createLinearGradient 16, 0, @worldW - 16, 0
    g.addColorStop 0, @terrain.accent
    g.addColorStop 1, '#ffffff'
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect 16, @h - 18, (@worldW - 32) * pct, 6, 3
    ctx.fill()
