<script setup>
import { useI18n } from 'vue-i18n'
import { characters } from '@/data/characters'
import { qibos } from '@/data/qibos'

const { t } = useI18n()

const entries = [
  { to: '/encyclopedia/characters', labelKey: 'nav.characters', desc: '涂山小玉、红宝石…' },
  { to: '/encyclopedia/qibo', labelKey: 'nav.qibo', desc: '小芽狐、焰哞哞…' },
  { to: '/encyclopedia/spirit', labelKey: 'nav.spirit', desc: '厨房的秘密…' },
  { to: '/encyclopedia/equipment', labelKey: 'nav.equipment', desc: '泣影、雷闪…' },
  { to: '/guides/character', labelKey: 'nav.guideCharacter', desc: '' },
  { to: '/tools/gacha', labelKey: 'nav.gacha', desc: '' },
  { to: '/tools/team', labelKey: 'nav.teamCalc', desc: '' },
  { to: '/contribute', labelKey: 'nav.contribute', desc: '' },
]
</script>

<template>
  <div class="home">
    <section class="hero">
      <p class="eyebrow">{{ t('app.tagline') }}</p>
      <h1>{{ t('app.name') }}</h1>
      <p class="lead">{{ t('home.welcome') }}</p>
      <p class="intro">{{ t('home.intro') }}</p>
      <p class="notice">{{ t('home.notice') }}</p>
    </section>

    <section class="stats" aria-label="stats">
      <h2>{{ t('home.quickStats') }}</h2>
      <div class="stat-grid">
        <div class="stat">
          <strong>{{ characters.length }}+</strong>
          <span>{{ t('home.characterCount') }}</span>
        </div>
        <div class="stat">
          <strong>{{ qibos.length }}+</strong>
          <span>{{ t('home.qiboCount') }}</span>
        </div>
        <div class="stat">
          <strong>30+</strong>
          <span>{{ t('home.spiritCount') }}</span>
        </div>
      </div>
    </section>

    <section class="modules">
      <h2>{{ t('home.modules') }}</h2>
      <div class="module-grid">
        <router-link v-for="e in entries" :key="e.to" :to="e.to" class="module-card">
          <h3>{{ t(e.labelKey) }}</h3>
          <p v-if="e.desc">{{ e.desc }}</p>
        </router-link>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  max-width: 1080px;
  min-width: 0;
}

.hero {
  padding: 28px 0 12px;
  animation: rise 0.55s ease both;

  @media (max-width: 719px) {
    padding: 12px 0 8px;
  }
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--c-star);
  letter-spacing: 0.12em;
  font-size: 12px;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 12px;
  font-size: clamp(22px, 7vw, 42px);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.25;
  background: linear-gradient(120deg, var(--c-text), var(--c-accent-soft) 55%, var(--c-star));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lead {
  margin: 0 0 10px;
  font-size: 16px;
  color: var(--c-accent-soft);
}

.intro {
  margin: 0 0 12px;
  max-width: 52em;
  color: var(--c-text-muted);
}

.notice {
  margin: 0;
  font-size: 12px;
  color: var(--c-text-muted);
  opacity: 0.85;
}

.stats,
.modules {
  margin-top: 32px;
  animation: rise 0.55s ease 0.08s both;
}

h2 {
  margin: 0 0 14px;
  font-size: 16px;
  color: var(--c-text);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 479px) {
    gap: 8px;
  }
}

.stat {
  padding: 18px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  text-align: center;
  min-width: 0;

  @media (max-width: 479px) {
    padding: 12px 8px;
  }

  strong {
    display: block;
    font-size: clamp(18px, 5vw, 26px);
    color: var(--c-accent);
  }

  span {
    color: var(--c-text-muted);
    font-size: 12px;
  }
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
  gap: 12px;
}

.module-card {
  display: block;
  padding: 18px 16px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: linear-gradient(160deg, rgba(14, 36, 52, 0.55), rgba(14, 36, 52, 0.2));
  color: var(--c-text);
  min-width: 0;
  transition:
    border-color 0.2s,
    transform 0.2s,
    box-shadow 0.2s;

  h3 {
    margin: 0 0 6px;
    font-size: 15px;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: var(--c-text-muted);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: var(--c-accent);
      transform: translateY(-2px);
      box-shadow: var(--shadow-glow);
      color: var(--c-text);
    }
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
