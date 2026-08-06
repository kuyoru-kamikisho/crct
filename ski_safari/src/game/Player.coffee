# 玩家滑雪者

export class Player
  constructor: (x, y) ->
    @x = x
    @y = y
    @vx = 0
    @vy = 0
    @w = 28
    @h = 40
    @laneTilt = 0
    @onGround = true
    @jumping = false
    @ducking = false
    @tricking = false
    @trickAngle = 0
    @trickName = ''
    @invincible = 0
    @shield = 0
    @magnet = 0
    @boost = 0
    @slow = 0
    @anim = 0
    @alive = true
    @hitFlash = 0

  reset: (x, y) ->
    @x = x
    @y = y
    @vx = @vy = 0
    @laneTilt = 0
    @onGround = true
    @jumping = @ducking = @tricking = false
    @trickAngle = 0
    @trickName = ''
    @invincible = @shield = @magnet = @boost = @slow = 0
    @anim = 0
    @alive = true
    @hitFlash = 0

  bounds: ->
    h = if @ducking then @h * 0.55 else @h
    yOff = if @ducking then @h * 0.45 else 0
    {
      x: @x - @w * 0.35
      y: @y - h + yOff
      w: @w * 0.7
      h: h * 0.85
    }

  update: (dt, input, terrain, speed) ->
    @anim += dt
    @invincible = Math.max 0, @invincible - dt
    @shield = Math.max 0, @shield - dt
    @magnet = Math.max 0, @magnet - dt
    @boost = Math.max 0, @boost - dt
    @slow = Math.max 0, @slow - dt
    @hitFlash = Math.max 0, @hitFlash - dt

    accel = 520 * (if terrain.friction < 0.85 then 0.7 else 1)
    maxVx = 280 * (if @ducking then 0.7 else 1)
    fric = terrain.friction

    if input.left
      @vx -= accel * dt
      @laneTilt = Math.max -0.55, @laneTilt - 3 * dt
    else if input.right
      @vx += accel * dt
      @laneTilt = Math.min 0.55, @laneTilt + 3 * dt
    else
      @vx *= Math.pow fric, dt * 60
      @laneTilt *= Math.pow 0.9, dt * 60

    @vx = Math.max -maxVx, Math.min maxVx, @vx
    @x += @vx * dt

    # 跳跃
    if input.jumpPressed and @onGround and not @ducking
      @vy = -420
      @onGround = false
      @jumping = true
      @ducking = false

    @ducking = input.duck and @onGround

    # 空中特技
    if input.trickPressed and not @onGround and not @tricking
      @tricking = true
      @trickAngle = 0
      tricks = ['360°翻转', '后空翻', '侧身回旋', '抓板特技', '螺旋扭转']
      @trickName = tricks[Math.floor Math.random() * tricks.length]

    if @tricking
      @trickAngle += Math.PI * 3.2 * dt
      if @trickAngle >= Math.PI * 2
        @tricking = false
        @trickAngle = 0
        return 'trick_done'

    # 重力
    unless @onGround
      @vy += 980 * dt
      @y += @vy * dt
      if @y >= 0
        @y = 0
        @vy = 0
        @onGround = true
        @jumping = false
        if @tricking
          @tricking = false
          @trickAngle = 0
          return 'trick_fail'
    else
      @y = 0

    null

  draw: (ctx, screenY, terrain) ->
    ctx.save()
    ctx.translate @x, screenY + @y
    ctx.rotate @laneTilt + (if @tricking then @trickAngle else 0)

    if @hitFlash > 0 and Math.floor(@hitFlash * 20) % 2 is 0
      ctx.globalAlpha = 0.35

    # 影子
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse 0, 8, 18, 6, 0, 0, Math.PI * 2
    ctx.fill()

    duckScale = if @ducking then 0.72 else 1
    ctx.scale 1, duckScale

    # 滑雪板
    ctx.fillStyle = terrain.accent
    ctx.fillRect -16, 10, 32, 5
    ctx.fillStyle = '#fff'
    ctx.fillRect -14, 11, 28, 2

    # 身体
    ctx.fillStyle = if @boost > 0 then '#ff8a4c' else '#1a6a9a'
    ctx.beginPath()
    ctx.roundRect -10, -28, 20, 36, 8
    ctx.fill()

    # 围巾
    ctx.fillStyle = '#ff5a6a'
    ctx.fillRect -8, -18, 16, 5

    # 头
    ctx.fillStyle = '#f5d0b0'
    ctx.beginPath()
    ctx.arc 0, -34, 10, 0, Math.PI * 2
    ctx.fill()

    # 头盔
    ctx.fillStyle = '#e8f4fc'
    ctx.beginPath()
    ctx.arc 0, -36, 11, Math.PI, 0
    ctx.fill()
    ctx.fillStyle = '#333'
    ctx.fillRect -8, -34, 16, 3

    # 护盾光环
    if @shield > 0
      ctx.strokeStyle = "rgba(127,212,255,#{0.4 + 0.4 * Math.sin(@anim * 8)})"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc 0, -10, 28, 0, Math.PI * 2
      ctx.stroke()

    # 加速火焰
    if @boost > 0
      ctx.fillStyle = "rgba(255,138,76,#{0.5 + 0.3 * Math.sin(@anim * 20)})"
      ctx.beginPath()
      ctx.moveTo -6, 14
      ctx.lineTo 0, 28 + Math.sin(@anim * 30) * 4
      ctx.lineTo 6, 14
      ctx.fill()

    ctx.restore()
