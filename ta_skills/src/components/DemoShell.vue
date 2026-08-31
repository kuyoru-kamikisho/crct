<template>
  <section class="demo">
    <header class="head">
      <span class="title">
        <i class="mdi mdi-play-box-outline"></i>
        {{ title }}
      </span>
      <button v-if="onReset" class="btn" @click="onReset">重置</button>
    </header>
    <div class="body">
      <aside class="params">
        <div class="sec">参数调节面板</div>
        <slot name="params" />
      </aside>
      <div class="stage">
        <div class="sec overlay">图形演示区</div>
        <slot name="stage" />
      </div>
    </div>
    <footer class="result">
      <div class="sec">结果显示区</div>
      <slot name="result" />
    </footer>
  </section>
</template>

<script>
export default {
  props: {
    title: { type: String, required: true },
    onReset: { type: Function, default: null }
  }
}
</script>

<style scoped>
.demo {
  margin: 18px 0 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  overflow: hidden;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--accent);
  letter-spacing: 0.04em;
}
.title i { font-size: 18px; }
.body {
  display: grid;
  grid-template-columns: 230px 1fr;
  min-height: 340px;
}
.params {
  border-right: 1px solid var(--border);
  padding: 10px 12px 16px;
  background: #10141b;
}
.stage {
  position: relative;
  min-height: 340px;
  background: #0c0e12;
}
.sec {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 8px;
}
.overlay {
  position: absolute;
  top: 8px;
  left: 10px;
  z-index: 2;
  pointer-events: none;
}
.result {
  border-top: 1px solid var(--border);
  padding: 10px 14px 14px;
  background: #0a0c10;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.7;
  color: #c8cdd8;
}
@media (max-width: 800px) {
  .body { grid-template-columns: 1fr; }
  .params { border-right: none; border-bottom: 1px solid var(--border); }
  .stage { min-height: 280px; }
}
</style>
