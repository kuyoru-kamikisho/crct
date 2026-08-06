/**
 * 工具函数
 */
const Utils = {
  uid() {
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  },

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  rand(min, max) {
    return Math.random() * (max - min) + min;
  },

  randInt(min, max) {
    return Math.floor(Utils.rand(min, max + 1));
  },

  pick(arr) {
    return arr[Utils.randInt(0, arr.length - 1)];
  },

  /** 格子中心坐标（相对 lawn） */
  cellCenter(col, row) {
    return {
      x: col * CONFIG.CELL_W + CONFIG.CELL_W / 2,
      y: row * CONFIG.CELL_H + CONFIG.CELL_H / 2,
    };
  },

  cellTopLeft(col, row) {
    return {
      x: col * CONFIG.CELL_W,
      y: row * CONFIG.CELL_H,
    };
  },

  /** 像素坐标转格子，超出返回 null */
  posToCell(x, y) {
    const col = Math.floor(x / CONFIG.CELL_W);
    const row = Math.floor(y / CONFIG.CELL_H);
    if (col < 0 || col >= CONFIG.COLS || row < 0 || row >= CONFIG.ROWS) return null;
    return { col, row };
  },

  dist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /** 创建 DOM */
  el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  },

  isMobile() {
    return (
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.matchMedia("(pointer: coarse)").matches)
    );
  },

  isPortrait() {
    return window.matchMedia("(orientation: portrait)").matches || window.innerHeight > window.innerWidth;
  },

  async requestFullscreen(el = document.documentElement) {
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        try {
          await screen.orientation.lock("landscape");
        } catch (_) {
          /* 部分浏览器不允许 */
        }
      }
      return true;
    } catch (_) {
      return false;
    }
  },
};
