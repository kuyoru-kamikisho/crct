/**
 * 星系旋涡型（宇宙）
 * API: MouseCursorGalaxy.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-galaxy';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, angle = 0, stars = [], nova = 0;

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
  function loop() {
    if (!enabled) return;
    angle += 0.045; nova *= 0.9;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (Math.random() < 0.35) {
      stars.push({
        x: mx, y: my, a: Math.random() * Math.PI * 2, r: 8 + Math.random() * 20,
        life: 1, hue: 220 + Math.random() * 80, sp: 0.04 + Math.random() * 0.05
      });
      if (stars.length > 40) stars.shift();
    }
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.a += s.sp; s.r += 0.35; s.life -= 0.015;
      if (s.life <= 0) { stars.splice(i, 1); continue; }
      const x = mx + Math.cos(s.a + angle) * s.r;
      const y = my + Math.sin(s.a + angle) * s.r * 0.65;
      ctx.fillStyle = `hsla(${s.hue},90%,75%,${s.life})`;
      ctx.beginPath(); ctx.arc(x, y, 1.5 + s.life, 0, Math.PI * 2); ctx.fill();
    }
    // spiral arms
    ctx.save(); ctx.translate(mx, my); ctx.rotate(angle);
    for (let arm = 0; arm < 3; arm++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      for (let t = 0; t < 18; t++) {
        const rr = t * 1.6 + nova * 6;
        const x = Math.cos(t * 0.35) * rr;
        const y = Math.sin(t * 0.35) * rr * 0.55;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${260 + arm * 30},90%,70%,0.55)`;
      ctx.lineWidth = 1.5; ctx.shadowColor = '#b388ff'; ctx.shadowBlur = 10; ctx.stroke();
    }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 10 + nova * 8);
    g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#d0a8ff'); g.addColorStop(1, 'rgba(80,40,160,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 10 + nova * 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick(e) {
    nova = 1;
    for (let i = 0; i < 24; i++) {
      stars.push({
        x: e.clientX, y: e.clientY, a: (Math.PI * 2 * i) / 24, r: 4,
        life: 1, hue: 250 + Math.random() * 60, sp: 0.1
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
      stars = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorGalaxy = api;
})(typeof window !== 'undefined' ? window : globalThis);
