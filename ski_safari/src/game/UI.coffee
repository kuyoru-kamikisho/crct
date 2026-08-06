# UI 屏幕管理与 HUD

import {
  DIFFICULTIES, LEVELS, TERRAINS
  loadProgress, saveProgress
} from './levels.coffee'

export class UI
  constructor: (@game, @sfx) ->
    @progress = loadProgress()
    @pendingLevel = LEVELS[0]
    @difficulty = DIFFICULTIES[@progress.lastDifficulty] or DIFFICULTIES.normal
    @screens =
      menu: document.getElementById 'screen-menu'
      difficulty: document.getElementById 'screen-difficulty'
      levels: document.getElementById 'screen-levels'
      howto: document.getElementById 'screen-howto'
      game: document.getElementById 'screen-game'
      pause: document.getElementById 'screen-pause'
      result: document.getElementById 'screen-result'
    @els =
      score: document.getElementById 'hud-score'
      distance: document.getElementById 'hud-distance'
      lives: document.getElementById 'hud-lives'
      power: document.getElementById 'hud-power'
      combo: document.getElementById 'hud-combo'
      comboCount: document.getElementById 'combo-count'
      trick: document.getElementById 'hud-trick'
      banner: document.getElementById 'level-banner'
      resultTitle: document.getElementById 'result-title'
      resultSub: document.getElementById 'result-subtitle'
      resultScore: document.getElementById 'result-score'
      resultDistance: document.getElementById 'result-distance'
      resultCoins: document.getElementById 'result-coins'
      resultCombo: document.getElementById 'result-combo'
      resultStars: document.getElementById 'result-stars'
      btnNext: document.getElementById 'btn-next'
    @bind()
    @renderDifficulties()
    @renderLevels()
    @detectTouch()
    @spawnMenuSnow()

  detectTouch: ->
    coarse = window.matchMedia('(pointer: coarse)').matches
    touch = 'ontouchstart' of window or navigator.maxTouchPoints > 0
    document.body.classList.toggle 'touch-device', coarse or touch

  show: (name) ->
    for key, el of @screens
      el.classList.toggle 'active', key is name

  bind: ->
    document.getElementById('btn-play').addEventListener 'click', =>
      @sfx.resume()
      @show 'difficulty'

    document.getElementById('btn-levels').addEventListener 'click', =>
      @sfx.resume()
      @renderLevels()
      @show 'levels'

    document.getElementById('btn-howto').addEventListener 'click', => @show 'howto'

    for btn in document.querySelectorAll '[data-back]'
      btn.addEventListener 'click', (e) =>
        @show e.currentTarget.getAttribute 'data-back'

    document.getElementById('btn-pause').addEventListener 'click', => @pauseGame()
    document.getElementById('btn-resume').addEventListener 'click', => @resumeGame()
    document.getElementById('btn-restart').addEventListener 'click', => @startLevel @pendingLevel
    document.getElementById('btn-quit').addEventListener 'click', =>
      @game.stop()
      @show 'menu'

    document.getElementById('btn-retry').addEventListener 'click', => @startLevel @pendingLevel
    document.getElementById('btn-menu').addEventListener 'click', =>
      @game.stop()
      @show 'menu'
    @els.btnNext.addEventListener 'click', => @nextLevel()

  renderDifficulties: ->
    list = document.getElementById 'difficulty-list'
    list.innerHTML = ''
    for id, d of DIFFICULTIES
      card = document.createElement 'button'
      card.type = 'button'
      card.className = 'diff-card'
      card.innerHTML = """
        <h3>#{d.name}</h3>
        <p>#{d.desc}</p>
        <div class="meta">速度 ×#{d.speedMul} · 得分 ×#{d.scoreMul} · 生命 #{d.lives}</div>
      """
      do (d) =>
        card.addEventListener 'click', =>
          @difficulty = d
          @progress.lastDifficulty = d.id
          saveProgress @progress
          @renderLevels()
          @show 'levels'
      list.appendChild card

  renderLevels: ->
    list = document.getElementById 'level-list'
    list.innerHTML = ''
    unlocked = new Set @progress.unlocked
    for level in LEVELS
      terrain = TERRAINS[level.terrain]
      stars = @progress.stars[level.id] or 0
      locked = not unlocked.has level.id
      card = document.createElement 'button'
      card.type = 'button'
      card.className = "level-card#{if locked then ' locked' else ''}#{if stars then ' cleared' else ''}"
      starStr = if locked then '🔒' else ('★'.repeat(stars) + '☆'.repeat(3 - stars))
      card.innerHTML = """
        <div>
          <div class="terrain-tag">#{terrain.name}</div>
          <h3>#{level.id}. #{level.name}</h3>
          <p>#{level.intro}</p>
        </div>
        <div class="stars">#{starStr}</div>
      """
      unless locked
        do (level) =>
          card.addEventListener 'click', => @startLevel level
      list.appendChild card

  startLevel: (level) ->
    @pendingLevel = level
    @sfx.resume()
    @show 'game'
    @screens.pause.classList.remove 'active'
    @screens.result.classList.remove 'active'
    @game.start level, @difficulty
    @showBanner "#{level.name} · #{TERRAINS[level.terrain].name}"
    @updateHud
      score: 0
      distance: 0
      lives: @difficulty.lives
      maxLives: @difficulty.lives
      combo: 0
      powers: []

  showBanner: (text) ->
    el = @els.banner
    el.textContent = text
    el.classList.remove 'hidden'
    el.style.animation = 'none'
    el.offsetHeight
    el.style.animation = ''
    clearTimeout @_bannerTimer
    @_bannerTimer = setTimeout (-> el.classList.add 'hidden'), 2200

  pauseGame: ->
    return unless @game.running
    @game.pause()
    @screens.pause.classList.add 'active'

  resumeGame: ->
    @screens.pause.classList.remove 'active'
    @game.resume()

  nextLevel: ->
    idx = LEVELS.findIndex (l) => l.id is @pendingLevel.id
    next = LEVELS[idx + 1]
    if next and @progress.unlocked.includes next.id
      @startLevel next
    else
      @game.stop()
      @show 'menu'

  onGameEvent: (type, data) =>
    switch type
      when 'hud' then @updateHud data
      when 'pause' then @pauseGame()
      when 'combo' then @showCombo data
      when 'trick' then @showTrick data
      when 'trick_fail' then @hideTrick()
      when 'result' then @showResult data

  updateHud: (data) ->
    @els.score.textContent = "#{data.score}"
    @els.distance.innerHTML = "#{data.distance}<span class=\"unit\">m</span>"
    livesHtml = ''
    maxL = data.maxLives or 3
    for i in [0...maxL]
      livesHtml += "<span class=\"heart#{if i >= data.lives then ' empty' else ''}\"></span>"
    # 可能有额外生命
    if data.lives > maxL
      for i in [maxL...data.lives]
        livesHtml += '<span class="heart"></span>'
    @els.lives.innerHTML = livesHtml
    @els.power.innerHTML = data.powers.map((p) -> "<span class=\"power-chip\">#{p}</span>").join ''
    if data.combo >= 3
      @showCombo data.combo
    else if data.combo is 0
      @els.combo.classList.add 'hidden'

  showCombo: (n) ->
    @els.combo.classList.remove 'hidden'
    @els.comboCount.textContent = "#{n}"
    @els.combo.style.animation = 'none'
    @els.combo.offsetHeight
    @els.combo.style.animation = ''

  showTrick: (name) ->
    @els.trick.textContent = name
    @els.trick.classList.remove 'hidden'
    clearTimeout @_trickTimer
    @_trickTimer = setTimeout (=> @hideTrick()), 900

  hideTrick: ->
    @els.trick.classList.add 'hidden'

  showResult: (data) ->
    @screens.pause.classList.remove 'active'
    @screens.result.classList.add 'active'
    if data.won
      @els.resultTitle.textContent = '通关成功！'
      @els.resultSub.textContent = "#{@pendingLevel.name} 完成"
      # 解锁下一关
      nextId = data.levelId + 1
      unless @progress.unlocked.includes nextId
        if LEVELS.some((l) -> l.id is nextId)
          @progress.unlocked.push nextId
      prev = @progress.stars[data.levelId] or 0
      @progress.stars[data.levelId] = Math.max prev, data.stars
      best = @progress.best[data.levelId] or 0
      @progress.best[data.levelId] = Math.max best, data.score
      saveProgress @progress
      @renderLevels()
      hasNext = LEVELS.some (l) => l.id is nextId and @progress.unlocked.includes nextId
      @els.btnNext.style.display = if hasNext then '' else 'none'
    else
      @els.resultTitle.textContent = '滑倒了…'
      @els.resultSub.textContent = '再试一次，挑战更高分！'
      @els.btnNext.style.display = 'none'

    @els.resultScore.textContent = "#{data.score}"
    @els.resultDistance.textContent = "#{data.distance}m"
    @els.resultCoins.textContent = "#{data.coins}"
    @els.resultCombo.textContent = "#{data.combo}"
    stars = ''
    for i in [0...3]
      stars += if i < data.stars then '<span class="star">★</span>' else '<span class="star" style="opacity:.25">☆</span>'
    @els.resultStars.innerHTML = stars

  spawnMenuSnow: ->
    box = document.getElementById 'snow-bg'
    return unless box
    for i in [0...36]
      flake = document.createElement 'span'
      flake.className = 'flake'
      size = 2 + Math.random() * 5
      flake.style.width = "#{size}px"
      flake.style.height = "#{size}px"
      flake.style.left = "#{Math.random() * 100}%"
      flake.style.animationDuration = "#{6 + Math.random() * 12}s"
      flake.style.animationDelay = "#{-Math.random() * 10}s"
      flake.style.opacity = "#{0.3 + Math.random() * 0.6}"
      box.appendChild flake
