# 简易 Web Audio 音效

export class Sfx
  constructor: ->
    @ctx = null
    @enabled = true
    @master = 0.18

  ensure: ->
    return @ctx if @ctx
    AC = window.AudioContext or window.webkitAudioContext
    return null unless AC
    @ctx = new AC()
    @ctx

  resume: ->
    ctx = @ensure()
    ctx?.resume?()

  tone: (freq, dur = 0.08, type = 'sine', gain = 1, slide = 0) ->
    return unless @enabled
    ctx = @ensure()
    return unless ctx
    now = ctx.currentTime
    osc = ctx.createOscillator()
    g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime freq, now
    if slide
      osc.frequency.linearRampToValueAtTime freq + slide, now + dur
    g.gain.setValueAtTime 0.0001, now
    g.gain.exponentialRampToValueAtTime @master * gain, now + 0.01
    g.gain.exponentialRampToValueAtTime 0.0001, now + dur
    osc.connect g
    g.connect ctx.destination
    osc.start now
    osc.stop now + dur + 0.02

  coin: -> @tone 880, 0.07, 'triangle', 0.9, 220
  gem: -> @tone 1200, 0.1, 'sine', 1, 400
  jump: -> @tone 320, 0.09, 'square', 0.5, 180
  trick: -> @tone 520, 0.12, 'triangle', 0.7, 300
  hit: -> @tone 120, 0.18, 'sawtooth', 0.8, -60
  power: -> @tone 440, 0.15, 'sine', 0.8, 440
  win: ->
    @tone 523, 0.12, 'triangle', 0.8
    setTimeout (=> @tone 659, 0.12, 'triangle', 0.8), 100
    setTimeout (=> @tone 784, 0.2, 'triangle', 0.9), 200
  lose: ->
    @tone 300, 0.15, 'sawtooth', 0.7, -80
    setTimeout (=> @tone 180, 0.25, 'sawtooth', 0.7, -40), 120
