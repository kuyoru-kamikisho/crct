<template>
  <section class="flow-tree">
    <div class="flow-tree__title">技能流程</div>

    <div class="flow-tree__canvas">
      <!-- 普攻五段 -->
      <div class="pugong-row">
        <button v-for="(seg, i) in pugongList" :key="seg.id" type="button" class="tree-node skill-btn pugong" :class="{
          'is-current': pugongSegment === i + 1,
          'is-derive-target': showChasePath && i === 3,
        }" :title="seg.name" @click="emit('pugong')">
          <span class="tree-node__tag">A{{ i + 1 }}</span>
        </button>
      </div>

      <!-- 垂直主干 -->
      <div class="spine">
        <i class="vline" />

        <RingProgress :value="energyPct" :size="64" :stroke-width="2">
          <button type="button" class="tree-node skill-btn rjineng" :class="{ disabled: !rjinengReady }" title="星决技"
            @click="emit('rjineng')">
            <span class="tree-node__tag">R</span>
          </button>
        </RingProgress>

        <i class="vline" />

        <!-- E 行：E —→ 追击，追击上指 A4 -->
        <div class="e-row">
          <RingCounter :count="ejinengMaxCharges" :now="ejinengCharges" :size="64" :stroke-width="2" :gap="12">
            <button type="button" class="tree-node skill-btn ejineng" :class="{ 'is-source': showChasePath }"
              title="星鸣技" @click="emit('ejineng')">
              <span class="tree-node__tag">E</span>
              <div v-if="ejinengCooling" class="cooldown-water" :style="{ height: ejinengCdProgress + '%' }" />
            </button>
          </RingCounter>

          <div class="path-h" :class="{ on: showChasePath }" aria-hidden="true">
            <span class="path-h__line" />
            <span class="path-h__head" />
          </div>

          <div class="chase-wrap">
            <!-- 追击 → A4 上行箭头 -->
            <div class="path-up" :class="{ on: showChasePath }" aria-hidden="true">
              <span class="path-up__caption">派生 A4</span>
              <span class="path-up__line" />
              <span class="path-up__head" />
            </div>

            <button type="button" class="tree-node skill-btn chase" :class="{ dim: !canChase, on: canChase }" title="追击"
              :disabled="!canChase" @click="emit('chase')">
              <span class="tree-node__label">追击</span>
            </button>
          </div>
        </div>

        <i class="vline" />

        <button type="button" class="tree-node skill-btn xjineng" :class="{ disabled: !xjinengReady }" title="星携技"
          @click="emit('xjineng')">
          <span class="tree-node__tag">3</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import RingCounter from '@/components/RingCounter.vue'
import RingProgress from '@/components/RingProgress.vue'

defineProps({
  pugongList: { type: Array, default: () => [] },
  pugongSegment: { type: Number, default: 1 },
  canChase: { type: Boolean, default: false },
  showChasePath: { type: Boolean, default: false },
  energyPct: { type: Number, default: 0 },
  rjinengReady: { type: Boolean, default: false },
  ejinengCharges: { type: Number, default: 0 },
  ejinengMaxCharges: { type: Number, default: 2 },
  ejinengCooling: { type: Boolean, default: false },
  ejinengCdProgress: { type: Number, default: 0 },
  xjinengReady: { type: Boolean, default: true },
})

const emit = defineEmits(['pugong', 'ejineng', 'rjineng', 'xjineng', 'chase'])
</script>

<style scoped lang="scss">
.flow-tree {
  margin-top: 8px;
  padding: 20px 24px 32px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: auto;
}

.flow-tree__title {
  font-size: 0.75rem;
  opacity: 0.55;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 18px;
}

.flow-tree__canvas {
  min-width: 520px;
}

.pugong-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 28px;
  margin-bottom: 4px;
}

.spine {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vline {
  display: block;
  width: 2px;
  height: 20px;
  background: linear-gradient(180deg,
      rgba(120, 170, 255, 0.12),
      rgba(120, 170, 255, 0.5),
      rgba(120, 170, 255, 0.12));
}

.e-row {
  display: flex;
  align-items: center;
  /* 让 E 仍落在主干中轴：左侧不额外占位，追击向右伸出 */
}

.chase-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

/* 水平：E → 追击 */
.path-h {
  width: 91px;
  margin: 0 6px;
  position: relative;
  display: flex;
  align-items: center;
  opacity: 0.22;
  transition: opacity 0.2s ease;
  pointer-events: none;

  &.on {
    opacity: 1;
  }

  &__line {
    display: block;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, #5ec8ff, #ffe09a);
    box-shadow: 0 0 6px rgba(255, 220, 120, 0.35);
  }

  &__head {
    position: absolute;
    right: -1px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-left: 8px solid #ffe09a;
    filter: drop-shadow(0 0 3px rgba(255, 200, 80, 0.55));
  }
}

/* 垂直：追击 → A4（向上） */
.path-up {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 4px);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.18;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 2;

  &.on {
    opacity: 1;
  }

  &__line {
    width: 2px;
    height: 92px;
    background: linear-gradient(0deg, #ffe09a, #5ec8ff);
    box-shadow: 0 0 6px rgba(255, 220, 120, 0.3);
  }

  &__head {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -100%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 8px solid #5ec8ff;
    filter: drop-shadow(0 0 3px rgba(94, 200, 255, 0.55));
  }

  &__caption {
    position: absolute;
    left: calc(100% + 8px);
    top: 42%;
    margin: 0;
    font-size: 0.68rem;
    color: #ffe09a;
    white-space: nowrap;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  }
}

.tree-node {
  position: relative;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.06);
  background-size: 100% 100%;
  background-position: center;
  color: inherit;
  cursor: pointer;
  overflow: hidden;
  transition:
    transform 0.15s ease,
    opacity 0.2s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover:not(:disabled):not(.dim) {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.35);
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.is-current {
    border-color: rgba(120, 200, 255, 0.9);
    box-shadow:
      0 0 0 2px rgba(94, 200, 255, 0.28),
      0 0 14px rgba(94, 200, 255, 0.4);
  }

  &.is-derive-target {
    border-color: rgba(255, 200, 80, 0.85);
    box-shadow:
      0 0 0 2px rgba(255, 200, 80, 0.22),
      0 0 14px rgba(255, 200, 80, 0.35);
  }

  &.is-source {
    border-color: rgba(94, 200, 255, 0.65);
  }

  &.pugong {
    background-image: url('../assets/skill/moyin/a.png');
  }

  &.ejineng {
    background-image: url('../assets/skill/moyin/b.png');
  }

  &.rjineng {
    background-image: url('../assets/skill/moyin/c.png');
  }

  &.xjineng {
    background-image: url('../assets/skill/moyin/d.png');
  }

  &.chase {
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at 40% 35%, rgba(255, 220, 140, 0.35), transparent 55%),
      rgba(40, 32, 18, 0.9);
    border-color: rgba(255, 200, 80, 0.35);

    &.dim {
      opacity: 0.28;
      filter: grayscale(0.35);
      cursor: default;
    }

    &.on {
      opacity: 1;
      filter: none;
      border-color: rgba(255, 200, 80, 0.9);
      box-shadow: 0 0 14px rgba(255, 200, 80, 0.4);
      animation: chase-pop 0.35s ease-out;
    }
  }
}

@keyframes chase-pop {
  from {
    transform: scale(0.86);
    opacity: 0.35;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

.tree-node__tag {
  position: absolute;
  left: 50%;
  bottom: -18px;
  transform: translateX(-50%);
  font-size: 0.68rem;
  opacity: 0.5;
  white-space: nowrap;
  pointer-events: none;
}

.tree-node__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #ffe09a;
  letter-spacing: 0.06em;
}

.cooldown-water {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background: linear-gradient(to top,
      rgba(80, 141, 255, 0.27) 0%,
      rgba(65, 141, 241, 0.27) 70%,
      rgba(69, 126, 248, 0.27) 100%);
  transition: height 0.05s linear;
  z-index: 2;
}
</style>
