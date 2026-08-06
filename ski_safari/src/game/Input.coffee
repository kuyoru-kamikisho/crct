# 输入：键盘 + 触控 + 滑动手势

export class Input
  constructor: ->
    @left = false
    @right = false
    @jump = false
    @duck = false
    @trick = false
    @jumpPressed = false
    @trickPressed = false
    @pausePressed = false
    @_keys = {}
    @_touchIds = {}
    @_swipe = null
    @_bound = false

  bind: ->
    return if @_bound
    @_bound = true
    window.addEventListener 'keydown', @onKeyDown
    window.addEventListener 'keyup', @onKeyUp
    window.addEventListener 'blur', @reset
    @bindTouchButtons()
    @bindSwipe()

  unbind: ->
    return unless @_bound
    @_bound = false
    window.removeEventListener 'keydown', @onKeyDown
    window.removeEventListener 'keyup', @onKeyUp
    window.removeEventListener 'blur', @reset

  onKeyDown: (e) =>
    return if e.repeat and e.code in ['Space', 'ArrowUp', 'KeyX', 'KeyP']
    @_keys[e.code] = true
    switch e.code
      when 'ArrowLeft', 'KeyA' then @left = true
      when 'ArrowRight', 'KeyD' then @right = true
      when 'ArrowDown', 'KeyZ', 'KeyS' then @duck = true
      when 'Space', 'ArrowUp', 'KeyW'
        e.preventDefault()
        @jump = true
        @jumpPressed = true
      when 'KeyX'
        @trick = true
        @trickPressed = true
      when 'KeyP', 'Escape'
        @pausePressed = true

  onKeyUp: (e) =>
    @_keys[e.code] = false
    switch e.code
      when 'ArrowLeft', 'KeyA' then @left = false unless @_keys['ArrowLeft'] or @_keys['KeyA'] or @_touchIds.left
      when 'ArrowRight', 'KeyD' then @right = false unless @_keys['ArrowRight'] or @_keys['KeyD'] or @_touchIds.right
      when 'ArrowDown', 'KeyZ', 'KeyS' then @duck = false unless @_keys['ArrowDown'] or @_keys['KeyZ'] or @_keys['KeyS'] or @_touchIds.duck
      when 'Space', 'ArrowUp', 'KeyW' then @jump = false
      when 'KeyX' then @trick = false

  bindTouchButtons: ->
    map =
      'touch-left': 'left'
      'touch-right': 'right'
      'touch-jump': 'jump'
      'touch-duck': 'duck'
      'touch-trick': 'trick'

    for id, action of map
      el = document.getElementById id
      continue unless el
      do (action) =>
        start = (e) =>
          e.preventDefault()
          @_touchIds[action] = true
          @[action] = true
          @jumpPressed = true if action is 'jump'
          @trickPressed = true if action is 'trick'
        end = (e) =>
          e.preventDefault()
          @_touchIds[action] = false
          @[action] = false unless action in ['jump', 'trick']
          @[action] = false if action in ['jump', 'trick']
        el.addEventListener 'pointerdown', start
        el.addEventListener 'pointerup', end
        el.addEventListener 'pointercancel', end
        el.addEventListener 'pointerleave', end

  bindSwipe: ->
    canvas = document.getElementById 'game-canvas'
    return unless canvas
    canvas.addEventListener 'pointerdown', (e) =>
      return if e.target.closest?('.touch-controls')
      @_swipe = { x: e.clientX, y: e.clientY, t: performance.now() }
    canvas.addEventListener 'pointerup', (e) =>
      return unless @_swipe
      dx = e.clientX - @_swipe.x
      dy = e.clientY - @_swipe.y
      dt = performance.now() - @_swipe.t
      @_swipe = null
      return if dt > 500
      ax = Math.abs dx
      ay = Math.abs dy
      if ax > 40 and ax > ay
        if dx < 0
          @left = true
          setTimeout (=> @left = false), 140
        else
          @right = true
          setTimeout (=> @right = false), 140
      else if ay > 40 and ay > ax
        if dy < 0
          @jumpPressed = true
          @jump = true
          setTimeout (=> @jump = false), 80
        else
          @duck = true
          setTimeout (=> @duck = false), 280

  reset: =>
    @left = @right = @jump = @duck = @trick = false
    @jumpPressed = @trickPressed = @pausePressed = false
    @_keys = {}
    @_touchIds = {}

  endFrame: ->
    @jumpPressed = false
    @trickPressed = false
    @pausePressed = false
