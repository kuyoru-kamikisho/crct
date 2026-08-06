/**
 * 入口：初始化游戏、移动端横屏与自适应
 */
(function main() {
  const game = new Game();
  UI.init(game);

  function onViewport() {
    UI.updateOrientHint();
    game.fitStage();
  }

  window.addEventListener("resize", onViewport);
  window.addEventListener("orientationchange", () => setTimeout(onViewport, 200));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.running && !game.ended && !game.paused) {
      UI.showPause();
    }
  });

  // 首次用户手势尝试全屏（移动端）
  let gestured = false;
  const tryFs = () => {
    if (gestured || !Utils.isMobile()) return;
    gestured = true;
    Utils.requestFullscreen(document.getElementById("app"));
  };
  document.addEventListener("pointerdown", tryFs, { once: true });

  onViewport();

  // 防止移动端橡皮筋滚动与双击缩放干扰
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.target.closest(".menu-panel, .seed-bar")) return;
      e.preventDefault();
    },
    { passive: false }
  );
})();
