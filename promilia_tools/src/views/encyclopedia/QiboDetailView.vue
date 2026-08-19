<script setup>
import { computed, nextTick, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getQiboById, qibos } from '@/data/qibos'
import SkillDesc from '@/components/common/SkillDesc.vue'
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'
import { replaceRp } from '@/utils/replaceRp'

const route = useRoute()
const { t } = useI18n()

const qibo = computed(() => getQiboById(route.params.id))
const crumbs = computed(() => [
  { to: '/', label: t('nav.home') },
  { to: '/encyclopedia/qibo', label: t('nav.qibo') },
  { label: qibo.value?.name || t('common.empty') },
])
const pixelAlt = computed(() =>
  qibo.value ? replaceRp(t('seo.qiboImageAlt'), qibo.value.name, qibo.value.no) : '',
)
const pixelFrames = computed(() => {
  const w = Number(qibo.value?.imageWidth)
  const h = Number(qibo.value?.imageHeight)
  if (w > 0 && h > 0) return Math.max(1, Math.round(w / h))
  return 8
})
const frameSize = computed(() => Number(qibo.value?.imageHeight) || 96)

const qiboIndex = computed(() => qibos.findIndex((item) => item.id === qibo.value?.id))
const prevQibo = computed(() => (qiboIndex.value > 0 ? qibos[qiboIndex.value - 1] : null))
const nextQibo = computed(() =>
  qiboIndex.value >= 0 && qiboIndex.value < qibos.length - 1 ? qibos[qiboIndex.value + 1] : null,
)

const metaRows = computed(() => {
  const item = qibo.value
  if (!item) return []
  return [
    [t('common.element'), (item.elements || []).join('、')],
    [t('common.race'), item.race],
    [t('common.stage'), item.stage],
    [t('common.sizeType'), item.sizeType],
    [t('common.height'), item.height],
    [t('common.battleTag'), item.battleTag],
    [t('common.obtain'), item.obtain],
    [t('common.location'), item.location],
    [t('common.captureRate'), item.captureRate],
  ].filter(([, value]) => value)
})

const evolutionChain = computed(() => {
  const item = qibo.value
  const list = item?.evolutions
  if (!list?.length) return []
  return list.map((evo) => {
    const matched =
      qibos.find((entry) => entry.wikiSlug === evo.wikiSlug) ||
      qibos.find((entry) => entry.name === evo.name && String(entry.no) === String(evo.no)) ||
      qibos.find((entry) => entry.name === evo.name) ||
      null
    return {
      ...evo,
      id: matched?.id,
      image: matched?.image,
      current: matched ? matched.id === item.id : evo.name === item.name,
    }
  })
})

const skillLevelMap = reactive({})
const focusedSkillName = computed(() => {
  const value = route.query.skill
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : ''
})

watch(
  () => qibo.value?.id,
  () => {
    Object.keys(skillLevelMap).forEach((key) => delete skillLevelMap[key])
  },
)

function currentSkillLevel(skill, index) {
  return skillLevelMap[index] ?? skill.maxLevel ?? skill.levels?.[skill.levels.length - 1]?.level ?? 1
}

function currentSkillDesc(skill, index) {
  const level = currentSkillLevel(skill, index)
  return skill.levels?.find((entry) => entry.level === level)?.desc || skill.desc || ''
}

function skillLevelLabel(skill, index) {
  return replaceRp(t('qibo.skillLevel'), currentSkillLevel(skill, index))
}

function scrollToFocusedSkill() {
  if (!qibo.value || !focusedSkillName.value) return
  nextTick(() => {
    requestAnimationFrame(() => {
      const index = qibo.value.skills?.findIndex((sk) => sk.name === focusedSkillName.value)
      if (index == null || index < 0) return
      document.getElementById(`qibo-skill-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  })
}

watch(() => [route.params.id, focusedSkillName.value], scrollToFocusedSkill, { immediate: true })

function onPixelError(event) {
  event.target.style.display = 'none'
}
</script>

<template>
  <article v-if="qibo" class="detail" aria-labelledby="qibo-heading">
    <AppBreadcrumb :items="crumbs" :label="t('header.breadcrumb')" />

    <header class="hero">
      <div class="showcase">
        <img src="@/assets/imgs/pixelstage.png" alt="" class="kibostage">
        <div class="kibo-pixel" :style="{ '--frames': pixelFrames }">
          <img v-if="qibo.image" class="pixel" :src="qibo.image" :alt="pixelAlt" :width="frameSize" :height="frameSize"
            decoding="async" @error="onPixelError" />
        </div>
      </div>

      <div class="identity">
        <p class="no">NO.{{ qibo.no }}</p>
        <h1 id="qibo-heading">{{ qibo.name }}</h1>
        <div class="tags">
          <span v-for="el in qibo.elements" :key="el" class="tag">{{ el }}</span>
          <span v-if="qibo.battleTag" class="tag muted">{{ qibo.battleTag }}</span>
          <span v-if="qibo.stage" class="tag muted">{{ qibo.stage }}</span>
          <span v-if="qibo.special" class="tag accent">{{ t('qibo.special') }}</span>
          <span v-if="qibo.shiny" class="tag star">{{ t('qibo.shiny') }}</span>
        </div>
        <p class="intro">{{ qibo.intro }}</p>
        <p v-if="qibo.wikiUrl" class="wiki">
          <a :href="qibo.wikiUrl" target="_blank" rel="noopener noreferrer">{{ t('qibo.wiki') }}</a>
        </p>
      </div>

      <dl class="meta">
        <div v-for="[label, value] in metaRows" :key="label">
          <dt>{{ label }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>
    </header>

    <section v-if="qibo.skills?.length">
      <h2>{{ t('common.skills') }}</h2>
      <ul class="skills">
        <li v-for="(sk, i) in qibo.skills" :id="`qibo-skill-${i}`" :key="i"
          :class="{ 'is-focus': focusedSkillName === sk.name }">
          <div class="skill-head">
            <strong>{{ sk.name }}</strong>
            <span v-if="sk.maxLevel" class="type">{{ skillLevelLabel(sk, i) }}</span>
          </div>
          <div v-if="sk.levels?.length > 1" class="levels" :aria-label="t('qibo.level')">
            <button v-for="lv in sk.levels" :key="lv.level" type="button"
              :class="{ on: currentSkillLevel(sk, i) === lv.level }" @click="skillLevelMap[i] = lv.level">
              {{ lv.level }}
            </button>
          </div>
          <SkillDesc>{{ currentSkillDesc(sk, i) }}</SkillDesc>
        </li>
      </ul>
    </section>

    <section v-if="qibo.properties?.length">
      <h2>{{ t('qibo.properties') }}</h2>
      <ul class="properties">
        <li v-for="(prop, i) in qibo.properties" :key="i">
          <strong>{{ prop.name }}</strong>
          <SkillDesc>{{ prop.desc }}</SkillDesc>
        </li>
      </ul>
    </section>

    <section v-if="evolutionChain.length">
      <h2>{{ t('qibo.evolutions') }}</h2>
      <ol class="evo">
        <li v-for="(node, i) in evolutionChain" :key="`${node.no}-${node.name}-${i}`">
          <router-link v-if="node.id && !node.current" :to="{ name: 'qibo-detail', params: { id: node.id } }"
            class="evo-card">
            <div v-if="node.image" class="evo-pixel">
              <img :src="node.image" :alt="node.name" :width="64" :height="64" decoding="async" />
            </div>
            <span class="evo-no">NO.{{ node.no }}</span>
            <strong>{{ node.name }}</strong>
            <span v-if="node.stage" class="evo-stage">{{ node.stage }}</span>
          </router-link>
          <div v-else class="evo-card" :class="{ current: node.current }">
            <div v-if="node.image || qibo.image" class="evo-pixel">
              <img :src="node.image || qibo.image" :alt="node.name" :width="64" :height="64" decoding="async" />
            </div>
            <span class="evo-no">NO.{{ node.no }}</span>
            <strong>{{ node.name }}</strong>
            <span v-if="node.stage" class="evo-stage">{{ node.stage }}</span>
          </div>
        </li>
      </ol>
    </section>

    <div v-if="qibo.homeJobs?.length || qibo.drops?.length" class="split">
      <section v-if="qibo.homeJobs?.length">
        <h2>{{ t('qibo.homeJobs') }}</h2>
        <div class="tags">
          <span v-for="job in qibo.homeJobs" :key="job" class="tag">{{ job }}</span>
        </div>
      </section>
      <section v-if="qibo.drops?.length">
        <h2>{{ t('qibo.drops') }}</h2>
        <div class="tags">
          <span v-for="drop in qibo.drops" :key="drop" class="tag muted">{{ drop }}</span>
        </div>
      </section>
    </div>

    <nav v-if="prevQibo || nextQibo" class="pager" :aria-label="t('header.quickNav')">
      <router-link v-if="prevQibo" class="pager-link" :to="{ name: 'qibo-detail', params: { id: prevQibo.id } }">
        <span class="dir">{{ t('qibo.prev') }}</span>
        <strong>NO.{{ prevQibo.no }} {{ prevQibo.name }}</strong>
      </router-link>
      <span v-else class="pager-link is-empty" />
      <router-link v-if="nextQibo" class="pager-link next" :to="{ name: 'qibo-detail', params: { id: nextQibo.id } }">
        <span class="dir">{{ t('qibo.next') }}</span>
        <strong>NO.{{ nextQibo.no }} {{ nextQibo.name }}</strong>
      </router-link>
    </nav>
  </article>
  <div v-else class="missing">
    <p>{{ t('common.empty') }}</p>
    <router-link to="/encyclopedia/qibo">{{ t('nav.qibo') }}</router-link>
  </div>
</template>

<style scoped lang="scss">
.detail {
  min-width: 0;
}

.hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1.2fr) minmax(16em, 0.9fr);
  gap: 22px;
  align-items: start;
  padding: 22px;
  border-radius: $radius-lg;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  margin-bottom: 24px;
  min-width: 0;

  @media (max-width: 960px) {
    grid-template-columns: auto minmax(0, 1fr);

    .meta {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
    padding: 16px;
    justify-items: center;

    .identity,
    .meta {
      justify-self: stretch;
    }
  }
}

.showcase {
  display: grid;
  place-items: center;
  padding: 16px;
  position: relative;
  border-radius: $radius-md;
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--c-accent) 22%, transparent), transparent 68%),
    rgba(0, 0, 0, 0.22);
}

.kibostage {
  position: absolute;
  top: 65%;
  left: 50%;
  width: 100px;
  height: 100px;
  object-fit: contain;
  transform: translate(-50%, -50%);
}


.kibo-pixel {
  overflow: hidden;
  width: 100px;
  height: 100px;
  margin-bottom: 40px;
}

.pixel {
  width: auto;
  height: 100%;
  display: block;
  max-width: unset;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  animation: pixelAnimation 1s steps(var(--frames, 8)) infinite;
}

@keyframes pixelAnimation {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pixel {
    animation: none;
  }
}

.no {
  margin: 0;
  font-size: 13px;
  color: var(--c-star);
}

h1 {
  margin: 4px 0 10px;
  font-size: clamp(22px, 6vw, 28px);
}

.intro {
  margin: 0;
  line-height: 1.75;
  color: var(--c-text);
  white-space: pre-line;
}

.wiki {
  margin: 12px 0 0;
  font-size: 13px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(62, 207, 207, 0.12);
  color: var(--c-accent-soft);

  &.muted {
    background: rgba(255, 255, 255, 0.06);
    color: var(--c-text-muted);
  }

  &.accent {
    background: color-mix(in srgb, var(--c-accent) 18%, transparent);
    color: var(--c-accent);
  }

  &.star {
    background: color-mix(in srgb, var(--c-star) 18%, transparent);
    color: var(--c-star);
  }
}

.meta {
  margin: 0;
  display: grid;
  gap: 10px;

  div {
    display: grid;
    grid-template-columns: minmax(4.5em, 72px) minmax(0, 1fr);
    gap: 8px;
  }

  dt {
    color: var(--c-text-muted);
  }

  dd {
    margin: 0;
  }
}

section {
  margin-bottom: 22px;
  padding: 18px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: rgba(11, 28, 41, 0.35);

  h2 {
    margin: 0 0 10px;
    font-size: 15px;
    color: var(--c-accent-soft);
  }
}

.skills,
.properties {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;

  li {
    padding: 12px;
    border-radius: $radius-sm;
    background: rgba(0, 0, 0, 0.2);
    min-width: 0;
    border: 1px solid transparent;
  }
}

.skills li {
  scroll-margin-top: calc(#{$header-h} + env(safe-area-inset-top, 0px) + 12px);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;

  &.is-focus {
    border-color: var(--c-accent);
    box-shadow: 0 0 0 1px rgba(62, 207, 207, 0.35);
  }
}

.skill-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.type {
  font-size: 12px;
  color: var(--c-star);
}

.levels {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 2px;
}

.levels button {
  min-width: 28px;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-text-muted);
  cursor: pointer;

  &.on {
    border-color: var(--c-accent);
    background: color-mix(in srgb, var(--c-accent) 16%, transparent);
    color: var(--c-accent-soft);
  }
}

.split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 22px;

  section {
    margin: 0;
  }

  .tags {
    margin: 0;
  }

  @media (max-width: 719px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.evo {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.evo-card {
  display: grid;
  justify-items: center;
  gap: 4px;
  min-width: 108px;
  padding: 12px 10px;
  border-radius: $radius-sm;
  border: 1px solid var(--c-border);
  background: rgba(0, 0, 0, 0.2);
  color: var(--c-text);
  text-align: center;
  text-decoration: none;

  &.current {
    border-color: var(--c-accent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--c-accent) 28%, transparent);
  }

  strong {
    font-size: 13px;
  }
}

a.evo-card:hover {
  color: var(--c-text);
  border-color: var(--c-accent-soft);
}

.evo-pixel {
  overflow: hidden;
  width: 64px;
  height: 64px;

  img {
    width: auto;
    height: 100%;
    max-width: unset;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
}

.evo-no,
.evo-stage {
  font-size: 11px;
  color: var(--c-text-muted);
}

.evo-no {
  color: var(--c-star);
}

.pager {
  display: flex;
  gap: 12px;
}

.pager-link {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
  padding: 12px 14px;
  border-radius: $radius-sm;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  text-decoration: none;

  &.next {
    text-align: right;
  }

  &.is-empty {
    visibility: hidden;
    pointer-events: none;
  }

  &:hover {
    color: var(--c-text);
    border-color: var(--c-accent);
  }

  .dir {
    font-size: 12px;
    color: var(--c-text-muted);
  }

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.missing {
  text-align: center;
  padding: 60px 20px;
  color: var(--c-text-muted);
}
</style>
