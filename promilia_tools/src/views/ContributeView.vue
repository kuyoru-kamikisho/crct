<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const contributors = [
  { name: 'Community', role: 'Init' },
]
</script>

<template>
  <div class="contribute">
    <h1>{{ t('contribute.title') }}</h1>

    <div class="grid">
      <section class="panel">
        <h2>{{ t('contribute.qq') }}</h2>
        <p class="num">{{ t('contribute.qqGroup') }}</p>
        <div class="qr-placeholder" aria-hidden="true">
          <span>QQ</span>
        </div>
        <p class="note">WIKI 玩家交流群 · 二维码占位</p>
      </section>

      <section class="panel">
        <h2>{{ t('contribute.repo') }}</h2>
        <p>
          <a href="https://github.com/kuyoru-kamikisho/crct" target="_blank" rel="noopener noreferrer">
            github.com/kuyoru-kamikisho/crct
          </a>
        </p>
        <p class="note">{{ t('contribute.howToDesc') }}</p>
      </section>

      <section class="panel">
        <h2>{{ t('contribute.contributors') }}</h2>
        <ul>
          <li v-for="c in contributors" :key="c.name">
            <strong>{{ c.name }}</strong>
            <span>{{ c.role }}</span>
          </li>
        </ul>
      </section>

      <section class="panel ad">
        <h2>{{ t('contribute.ad') }}</h2>
        <p>{{ t('contribute.adHint') }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
h1 {
  margin: 0 0 20px;
  font-size: 22px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.panel {
  padding: 18px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);

  h2 {
    margin: 0 0 10px;
    font-size: 15px;
    color: var(--c-accent-soft);
  }

  p,
  .note {
    margin: 0;
    color: var(--c-text-muted);
    font-size: 13px;
    line-height: 1.7;
  }
}

.num {
  font-size: 22px !important;
  color: var(--c-star) !important;
  letter-spacing: 0.06em;
  margin-bottom: 12px !important;
}

.qr-placeholder {
  width: 120px;
  height: 120px;
  margin: 0 auto 10px;
  border: 1px dashed var(--c-border);
  border-radius: $radius-sm;
  display: grid;
  place-items: center;
  color: var(--c-text-muted);
  background: rgba(0, 0, 0, 0.2);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--c-border);
    font-size: 13px;

    span {
      color: var(--c-text-muted);
    }
  }
}

.ad {
  min-height: 140px;
  background:
    linear-gradient(135deg, rgba(62, 207, 207, 0.08), transparent),
    var(--c-surface);
}
</style>
