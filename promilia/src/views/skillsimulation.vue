<template>
  <div class="sim" :data-tick="tick">
    <header class="sim__header">
      <h1>{{ character.name }} · 技能模拟</h1>
      <p class="sim__hint">A 普攻 / 追击 · E 星鸣技 · R 星决技 · 3 星携技 · Esc 重置</p>
    </header>

    <section class="panel status">
      <div class="stat">
        <span class="stat__label">星决蓄能</span>
        <div class="bar">
          <div class="bar__fill energy" :style="{ width: energyPct + '%' }" />
          <span class="bar__text">{{ character.energy }} / {{ character.energyMax }}</span>
        </div>
      </div>
      <div class="stat marks">
        <span class="stat__label">印记</span>
        <div class="mark-row">
          <span class="mark lei">雷 ×{{ character.marks.lei }}/{{ character.markMax }}</span>
          <span class="mark feng">风 ×{{ character.marks.feng }}/{{ character.markMax }}</span>
        </div>
      </div>
      <div class="stat">
        <span class="stat__label">Buff</span>
        <div class="buff-row">
          <span v-if="!buffs.length" class="muted">无</span>
          <span
            v-for="b in buffs"
            :key="b.id"
            class="buff"
            :class="{ cuican: b.id === 'cuican' }"
          >
            {{ b.name }} {{ b.remainText }}s
          </span>
        </div>
      </div>
      <div class="stat">
        <span class="stat__label">连段</span>
        <span>普攻第 {{ character.pugongSegment }} 段 · {{ character.pugong?.name }}</span>
      </div>
    </section>

    <section class="panel skills">
      <button
        class="skill-btn pugong"
        :class="{ disabled: !canPugong, derive: canChase }"
        @click="onPugong"
      >
        <span class="skill-btn__name">{{ canChase ? '追击' : '普攻' }}</span>
        <span class="skill-btn__sub">{{ canChase ? '派生' : `${character.pugongSegment}` }}</span>
        <span class="skill-btn__key">A</span>
      </button>

      <button
        class="skill-btn ejineng"
        :class="{ disabled: !ejinengReady }"
        @click="onEjineng"
      >
        <span class="skill-btn__name">星鸣技</span>
        <span class="skill-btn__sub">
          充能 {{ ejinengCharges }}/{{ ejinengMaxCharges }}
          <template v-if="ejinengCooldown"> · CD {{ ejinengCooldown }}s</template>
        </span>
        <span class="skill-btn__key">E</span>
        <div
          v-if="ejinengCooldown && ejinengCharges < ejinengMaxCharges"
          class="cooldown"
        >
          {{ ejinengCooldown }}
        </div>
      </button>

      <button
        class="skill-btn rjineng"
        :class="{ disabled: !rjinengReady }"
        @click="onRjineng"
      >
        <span class="skill-btn__name">星决技</span>
        <span class="skill-btn__sub">能量 {{ rjinengCost }}</span>
        <span class="skill-btn__key">R</span>
      </button>

      <button
        class="skill-btn xjineng"
        :class="{ disabled: !xjinengReady }"
        @click="onXjineng"
      >
        <span class="skill-btn__name">星携技</span>
        <span class="skill-btn__sub">入场</span>
        <span class="skill-btn__key">3</span>
      </button>
    </section>

    <section class="panel debug">
      <span class="stat__label">调试</span>
      <button type="button" @click="character.debugAddLei(1)">+雷印记</button>
      <button type="button" @click="character.debugAddFeng(1)">+风印记</button>
      <button type="button" @click="character.debugFillEnergy()">充满能量</button>
      <button type="button" @click="character.debugCuican()">给璀璨</button>
      <button type="button" class="danger" @click="character.reset()">重置</button>
    </section>

    <section class="panel log">
      <div class="log__title">战斗日志</div>
      <ul>
        <li v-for="item in logs" :key="item.id">{{ item.msg }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import createMoyin from '@/class/moyin'
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'

const character = createMoyin()
/** 每次技能/计时器变更 +1，驱动模板重渲染（class 实例本身非响应式） */
const tick = shallowRef(0)

let unsubscribe = null

onMounted(() => {
  unsubscribe = character.subscribe(() => {
    tick.value++
  })
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  unsubscribe?.()
  window.removeEventListener('keydown', onKey)
  character.reset()
})

function snap(fn) {
  return computed(() => {
    tick.value
    return fn()
  })
}

const energyPct = snap(() => (character.energy / character.energyMax) * 100)
const buffs = snap(() =>
  character.buffList.map((b) => ({
    id: b.id,
    name: b.name,
    remainText: b.remainText,
  })),
)
const logs = snap(() => character.logs.map((l) => ({ id: l.id, msg: l.msg })))
const canChase = snap(() => !!character.findDeriveChase())
const canPugong = snap(() => canChase.value || !!character.pugong?.isReady)
const ejinengReady = snap(() => !!character.ejineng?.isReady)
const ejinengCharges = snap(() => character.ejineng?.charges ?? 0)
const ejinengMaxCharges = snap(() => character.ejineng?.maxCharges ?? 0)
const ejinengCooldown = snap(() => character.ejineng?.cooldownText || '')
const rjinengReady = snap(() => !!character.rjineng?.isReady)
const rjinengCost = snap(() => character.rjineng?.energyCost ?? 100)
const xjinengReady = snap(() => !!character.xjineng?.isReady)

function onPugong() {
  character.castPugong()
}
function onEjineng() {
  character.castEjineng()
}
function onRjineng() {
  character.castRjineng()
}
function onXjineng() {
  character.castXjineng()
}

function onKey(e) {
  if (e.repeat) return
  const k = e.key.toLowerCase()
  if (k === 'e') onEjineng()
  else if (k === 'r') onRjineng()
  else if (k === '3') onXjineng()
  else if (k === 'escape') character.reset()
}
</script>

<style scoped lang="scss">
.sim {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background:
    radial-gradient(ellipse 80% 50% at 20% 0%, rgba(120, 180, 255, 0.18), transparent),
    radial-gradient(ellipse 60% 40% at 90% 10%, rgba(180, 120, 255, 0.12), transparent),
    #0f141c;
  color: #e8eef7;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.sim__header {
  margin-bottom: 20px;
  h1 {
    margin: 0 0 6px;
    font-size: 1.6rem;
    font-weight: 650;
    letter-spacing: 0.04em;
  }
}
.sim__hint {
  margin: 0;
  opacity: 0.55;
  font-size: 0.85rem;
}

.panel {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 14px;
}

.status {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.stat__label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.55;
  margin-bottom: 6px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.bar {
  position: relative;
  height: 22px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.bar__fill {
  height: 100%;
  transition: width 0.15s linear;
  &.energy {
    background: linear-gradient(90deg, #5b8cff, #9b6bff);
  }
}
.bar__text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.mark-row,
.buff-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mark,
.buff {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.08);
}
.mark.lei {
  background: rgba(160, 100, 255, 0.25);
  color: #d4b8ff;
}
.mark.feng {
  background: rgba(80, 200, 160, 0.22);
  color: #9fe8d0;
}
.buff.cuican {
  background: rgba(255, 200, 80, 0.22);
  color: #ffe09a;
}
.muted {
  opacity: 0.4;
}

.skills {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.skill-btn {
  position: relative;
  min-width: 120px;
  padding: 14px 16px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: transform 0.12s ease, border-color 0.12s ease, opacity 0.12s ease;

  &:hover:not(.disabled) {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.28);
  }
  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  &.derive {
    border-color: rgba(255, 200, 80, 0.55);
    box-shadow: 0 0 0 1px rgba(255, 200, 80, 0.2);
  }
  &.pugong {
    background: linear-gradient(160deg, rgba(90, 140, 255, 0.2), rgba(255, 255, 255, 0.04));
  }
  &.ejineng {
    background: linear-gradient(160deg, rgba(160, 100, 255, 0.22), rgba(255, 255, 255, 0.04));
  }
  &.rjineng {
    background: linear-gradient(160deg, rgba(255, 120, 160, 0.2), rgba(255, 255, 255, 0.04));
  }
  &.xjineng {
    background: linear-gradient(160deg, rgba(80, 200, 160, 0.18), rgba(255, 255, 255, 0.04));
  }
}
.skill-btn__name {
  display: block;
  font-weight: 600;
  font-size: 1rem;
}
.skill-btn__sub {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  opacity: 0.65;
}
.skill-btn__key {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 0.7rem;
  opacity: 0.45;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 1px 5px;
}
.cooldown {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 600;
  pointer-events: none;
}

.debug {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  button {
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.06);
    color: inherit;
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 0.85rem;
    &:hover {
      background: rgba(255, 255, 255, 0.12);
    }
    &.danger {
      border-color: rgba(255, 100, 100, 0.35);
      color: #ffb0b0;
    }
  }
}

.log {
  max-height: 320px;
  overflow: auto;
}
.log__title {
  font-size: 0.75rem;
  opacity: 0.55;
  margin-bottom: 8px;
  letter-spacing: 0.08em;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.88rem;
  line-height: 1.55;
  li {
    padding: 3px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    opacity: 0.85;
  }
}
</style>
