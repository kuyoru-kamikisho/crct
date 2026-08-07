/**
 * 像素块型（游戏复古）
 * API: MouseCursorPixel.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-pixel';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, bits = [], blink = 0, shake = 0;

  function ensure() {
    if (canvas) return;
    canvas = document.createElement('canvas'); canvas.id = ID;
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2147483646' });
    document.body.appendChild(canvas); ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; resize();
  }
  function resize() {
    if (!canvas) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
  }
  function hide(on) {
    document.documentElement.classList.toggle('mc-hide-cursor', on);
    if (on && !document.getElementById('mc-hide-cursor-style')) {
      const s = document.createElement('style'); s.id = 'mc-hide-cursor-style';
      s.textContent = '.mc-hide-cursor,.mc-hide-cursor *{cursor:none!important}'; document.head.appendChild(s);
    }
  }
  function px(x, y, s, c, a) {
    ctx.globalAlpha = a; ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }
  function loop() {
    if (!enabled) return;
    blink = (blink + 1) % 40; shake *= 0.85;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.x += b.vx; b.y += b.vy; b.life -= 0.025;
      if (b.life <= 0) { bits.splice(i, 1); continue; }
      px(b.x, b.y, b.s, b.c, b.life);
    }
    const ox = (Math.random() - 0.5) * shake * 4;
    const oy = (Math.random() - 0.5) * shake * 4;
    const cx = Math.round(mx / 4) * 4 + ox;
    const cy = Math.round(my / 4) * 4 + oy;
    const palette = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
    // arrow-like pixel cursor
    const map = [
      [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],
      [1,1],[1,2],[1,3],[1,4],
      [2,2],[2,3],[2,5],
      [3,3],[3,6],
      [4,4],[4,7],
      [5,5]
    ];
    map.forEach(([dx, dy], i) => {
      px(cx + dx * 4, cy + dy * 4, 4, palette[i % palette.length], blink < 36 ? 1 : 0.5);
    });
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) {
    if (Math.hypot(e.clientX - mx, e.clientY - my) > 5) {
      bits.push({
        x: Math.round(mx / 4) * 4, y: Math.round(my / 4) * 4,
        vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
        s: 4, c: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'][Math.floor(Math.random() * 4)], life: 1
      });
      if (bits.length > 30) bits.shift();
    }
    mx = e.clientX; my = e.clientY;
  }
  function onClick(e) {
    shake = 1;
    for (let i = 0; i < 12; i++) {
      bits.push({
        x: e.clientX, y: e.clientY,
        vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
        s: 4, c: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'][i % 4], life: 1
      });
    }
  }
  const api = {
    enable() {
      if (enabled) return api; enabled = true; ensure(); hide(true);
      addEventListener('resize', resize); addEventListener('mousemove', onMove); addEventListener('mousedown', onClick);
      raf = requestAnimationFrame(loop); return api;
    },
    disable() {
      if (!enabled) return api; enabled = false; cancelAnimationFrame(raf);
      removeEventListener('resize', resize); removeEventListener('mousemove', onMove); removeEventListener('mousedown', onClick);
      bits = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorPixel = api;
})(typeof window !== 'undefined' ? window : globalThis);
