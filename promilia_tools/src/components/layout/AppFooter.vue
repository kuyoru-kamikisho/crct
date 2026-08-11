<script setup>
import { useI18n } from 'vue-i18n'
import { footerLinks } from '@/data/navigation'

const { t } = useI18n()
</script>

<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <div>
        <h3>{{ t('footer.links') }}</h3>
        <ul>
          <li v-for="link in footerLinks" :key="link.href">
            <a :href="link.href" target="_blank" rel="noopener noreferrer">{{ t(link.key) }}</a>
          </li>
        </ul>
      </div>
      <div class="meta">
        <p>{{ t('footer.copyright') }}</p>
        <p>{{ t('footer.cc') }}</p>
        <p class="brand-line">{{ t('app.name') }} · {{ t('app.nameEn') }}</p>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.app-footer {
  margin-left: $sidebar-w;
  border-top: 1px solid var(--c-border);
  background: rgba(5, 12, 18, 0.7);
  padding: 28px 24px;
  transition: margin-left 0.25s ease;

  :global(.app-shell.is-collapsed) & {
    margin-left: 64px;
  }

  @media (max-width: 900px) {
    margin-left: 0 !important;
  }
}

.footer-inner {
  max-width: 1100px;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
}

h3 {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--c-accent-soft);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    margin-bottom: 6px;
  }

  a {
    color: var(--c-text-muted);

    &:hover {
      color: var(--c-accent);
    }
  }
}

.meta p {
  margin: 0 0 8px;
  color: var(--c-text-muted);
  font-size: 12px;
  line-height: 1.7;
}

.brand-line {
  color: var(--c-star) !important;
  margin-top: 12px !important;
}
</style>
