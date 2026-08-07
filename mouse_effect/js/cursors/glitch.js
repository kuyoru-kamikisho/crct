/**
 * 故障抖动型（赛博/故障艺术）
 * API: MouseCursorGlitch.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-glitch';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, slices = [], tick = 0, hard = 0;

  function ensure() {
    if (canvas) return;
    canvas = document.createElement('canvas'); canvas.id = ID;
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2147483646' });
    document.body.appendChild(canvas); ctx = canvas.getContext('2d'); resize();
  }
  function resize() {
    if (!canvas) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function hide(on) {
    document.documentElement.classList.toggle('mc-hide-cursor', on);
    if (on && !document.getElementById('mc-hide-cursor-style')) {
      const s = document.createElement('style'); s.id = 'mc-hide-cursor-style';
      s.textContent = '.mc-hide-cursor,.mc-hide-cursor *{cursor:none!important}'; document.head.appendChild(s);
    }
  }
  function cursorShape(x, y, color, ox) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + ox, y);
    ctx.lineTo(x + ox, y + 16);
    ctx.lineTo(x + 5 + ox, y + 12);
    ctx.lineTo(x + 10 + ox, y + 20);
    ctx.lineTo(x + 13 + ox, y + 18);
    ctx.lineTo(x + 7 + ox, y + 11);
    ctx.lineTo(x + 12 + ox, y + 11);
    ctx.closePath(); ctx.fill();
  }
  function loop() {
    if (!enabled) return;
    tick++; hard *= 0.88;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = slices.length - 1; i >= 0; i--) {
      const s = slices[i]; s.life -= 0.04;
      if (s.life <= 0) { slices.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(${s.rgb},${s.life * 0.5})`;
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }
    const jx = (Math.random() - 0.5) * (2 + hard * 10);
    const jy = (Math.random() - 0.5) * (2 + hard * 8);
    cursorShape(mx + jx, my + jy, '#ff2a6d', -3);
    cursorShape(mx + jx, my + jy, '#05d9e8', 3);
    cursorShape(mx + jx, my + jy, '#ffffff', 0);
    if (tick % 7 === 0) {
      slices.push({
        x: mx - 10 + Math.random() * 20, y: my + Math.random() * 20,
        w: 8 + Math.random() * 24, h: 2 + Math.random() * 3,
        life: 1, rgb: Math.random() > 0.5 ? '255,42,109' : '5,217,232'
      });
      if (slices.length > 16) slices.shift();
    }
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick(e) {
    hard = 1;
    for (let i = 0; i < 10; i++) {
      slices.push({
        x: e.clientX + (Math.random() - 0.5) * 40, y: e.clientY + (Math.random() - 0.5) * 40,
        w: 10 + Math.random() * 30, h: 2 + Math.random() * 4, life: 1,
        rgb: Math.random() > 0.5 ? '255,42,109' : '5,217,232'
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
      slices = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorGlitch = api;
})(typeof window !== 'undefined' ? window : globalThis);
