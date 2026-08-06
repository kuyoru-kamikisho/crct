# 粒子与飘字特效

rand = (a, b) -> a + Math.random() * (b - a)

export class ParticleSystem
  constructor: ->
    @particles = []
    @floats = []

  clear: ->
    @particles = []
    @floats = []

  emit: (x, y, opts = {}) ->
    count = opts.count ? 8
    color = opts.color ? '#ffffff'
    life = opts.life ? 0.6
    speed = opts.speed ? 120
    size = opts.size ? 3
    gravity = opts.gravity ? 200
    for i in [0...count]
      angle = opts.angle ? rand(0, Math.PI * 2)
      if opts.spread?
        angle = (opts.angle ? -Math.PI / 2) + rand(-opts.spread, opts.spread)
      sp = speed * rand(0.4, 1.2)
      @particles.push
        x: x
        y: y
        vx: Math.cos(angle) * sp
        vy: Math.sin(angle) * sp
        life: life * rand(0.5, 1)
        maxLife: life
        size: size * rand(0.5, 1.4)
        color: color
        gravity: gravity
        drag: opts.drag ? 0.98

  snowSpray: (x, y, dir = 0) ->
    @emit x, y,
      count: 5
      color: 'rgba(255,255,255,0.85)'
      life: 0.35
      speed: 80
      size: 2.5
      gravity: 40
      angle: Math.PI / 2 + dir * 0.4
      spread: 0.9

  sparkle: (x, y, color = '#ffd56a') ->
    @emit x, y,
      count: 12
      color: color
      life: 0.5
      speed: 160
      size: 3
      gravity: 80

  burst: (x, y, color = '#7fd4ff') ->
    @emit x, y,
      count: 18
      color: color
      life: 0.7
      speed: 220
      size: 4
      gravity: 120

  floatText: (x, y, text, color = '#ffd56a') ->
    @floats.push
      x: x
      y: y
      text: text
      color: color
      life: 0.9
      vy: -60

  update: (dt) ->
    next = []
    for p in @particles
      p.life -= dt
      continue if p.life <= 0
      p.vx *= p.drag
      p.vy = p.vy * p.drag + p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      next.push p
    @particles = next

    floats = []
    for f in @floats
      f.life -= dt
      continue if f.life <= 0
      f.y += f.vy * dt
      floats.push f
    @floats = floats

  draw: (ctx, camY) ->
    for p in @particles
      alpha = Math.max 0, p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc p.x, p.y - camY, p.size, 0, Math.PI * 2
      ctx.fill()
    ctx.globalAlpha = 1

    ctx.font = 'bold 16px Outfit, sans-serif'
    ctx.textAlign = 'center'
    for f in @floats
      alpha = Math.min 1, f.life * 2
      ctx.globalAlpha = alpha
      ctx.fillStyle = f.color
      ctx.fillText f.text, f.x, f.y - camY
    ctx.globalAlpha = 1
    ctx.textAlign = 'left'
