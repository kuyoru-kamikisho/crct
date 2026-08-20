<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'

const { t, tm } = useI18n()

const PREVIEW_URL = 'https://apwiki.kuyoru.com/'
const REPO_URL = 'https://github.com/kuyoru-kamikisho/crct'

const contributors = [{ name: 'Community', role: 'Init' }]

const crumbs = computed(() => [
  { to: '/', label: t('nav.home') },
  { label: t('nav.contribute') },
])

function asList(key) {
  const value = tm(key)
  return Array.isArray(value) ? value : []
}

const contentRoles = computed(() => asList('contribute.contentRoles'))
const techItems = computed(() => asList('contribute.techItems'))
const infraItems = computed(() => asList('contribute.infraItems'))
const startSteps = computed(() => asList('contribute.startSteps'))
const neededItems = computed(() => asList('contribute.neededItems'))
const principles = computed(() => asList('contribute.principles'))
const faqs = computed(() => asList('contribute.faq'))

const invites = computed(() => [
  {
    no: '01',
    title: t('contribute.contentTitle'),
    lead: t('contribute.contentLead'),
    items: contentRoles.value,
    close: t('contribute.contentClose'),
  },
  {
    no: '02',
    title: t('contribute.techTitle'),
    lead: t('contribute.techLead'),
    items: techItems.value,
    close: t('contribute.techClose'),
  },
  {
    no: '03',
    title: t('contribute.infraTitle'),
    lead: t('contribute.infraLead'),
    items: infraItems.value,
    close: t('contribute.infraClose'),
  },
])
</script>

<template>
  <div class="contribute">
    <AppBreadcrumb :items="crumbs" :label="t('header.breadcrumb')" />

    <header class="hero">
      <p class="eyebrow">{{ t('contribute.eyebrow') }}</p>
      <h1>{{ t('contribute.title') }}</h1>
      <p class="letter-title">{{ t('contribute.letterTitle') }}</p>
      <p class="greeting">{{ t('contribute.greeting') }}</p>
      <p class="identity">{{ t('contribute.identity') }}</p>
      <div class="cta">
        <a class="btn primary" :href="PREVIEW_URL" target="_blank" rel="noopener noreferrer">
          {{ t('contribute.previewCta') }}
        </a>
        <a class="btn" :href="REPO_URL" target="_blank" rel="noopener noreferrer">
          {{ t('contribute.repoCta') }}
        </a>
      </div>
    </header>

    <article class="letter">
      <section>
        <p>{{ t('contribute.origin') }}</p>
      </section>

      <section>
        <h2>{{ t('contribute.visionTitle') }}</h2>
        <p>{{ t('contribute.vision') }}</p>
      </section>

      <section>
        <h2>{{ t('contribute.progressTitle') }}</h2>
        <p>{{ t('contribute.progress') }}</p>
        <i18n-t keypath="contribute.preview" tag="p">
          <template #link>
            <a :href="PREVIEW_URL" target="_blank" rel="noopener noreferrer">apwiki.kuyoru.com</a>
          </template>
        </i18n-t>
      </section>

      <section>
        <h2>{{ t('contribute.challengesTitle') }}</h2>
        <p>{{ t('contribute.challengeLead') }}</p>
        <div class="challenge-grid">
          <div class="challenge">
            <span class="mark">1</span>
            <h3>{{ t('contribute.challenge1Title') }}</h3>
            <p>{{ t('contribute.challenge1') }}</p>
          </div>
          <div class="challenge">
            <span class="mark">2</span>
            <h3>{{ t('contribute.challenge2Title') }}</h3>
            <p>{{ t('contribute.challenge2') }}</p>
          </div>
        </div>
      </section>

      <section>
        <h2>{{ t('contribute.invitesTitle') }}</h2>
        <p>{{ t('contribute.inviteLead') }}</p>
        <ol class="invites">
          <li v-for="invite in invites" :key="invite.no" class="invite">
            <span class="no">{{ invite.no }}</span>
            <div>
              <h3>{{ invite.title }}</h3>
              <p>{{ invite.lead }}</p>
              <ul>
                <li v-for="(item, i) in invite.items" :key="i">{{ item }}</li>
              </ul>
              <p>{{ invite.close }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section>
        <h2>{{ t('contribute.startTitle') }}</h2>
        <ol class="steps">
          <li v-for="(step, i) in startSteps" :key="i">
            <span>{{ String(i + 1).padStart(2, '0') }}</span>
            <p>{{ step }}</p>
          </li>
        </ol>
      </section>

      <section>
        <h2>{{ t('contribute.neededTitle') }}</h2>
        <ul class="needed">
          <li v-for="(item, i) in neededItems" :key="i">{{ item }}</li>
        </ul>
      </section>

      <section>
        <h2>{{ t('contribute.principlesTitle') }}</h2>
        <ul class="principles">
          <li v-for="(item, i) in principles" :key="i">{{ item }}</li>
        </ul>
      </section>

      <section>
        <h2>{{ t('contribute.faqTitle') }}</h2>
        <dl class="faq">
          <template v-for="(item, i) in faqs" :key="i">
            <dt>{{ item.q }}</dt>
            <dd>{{ item.a }}</dd>
          </template>
        </dl>
      </section>

      <p class="closing">{{ t('contribute.closing') }}</p>
    </article>

    <div class="grid">
      <section class="panel">
        <h2>{{ t('contribute.qq') }}</h2>
        <p class="num">{{ t('contribute.qqGroup') }}</p>
        <div class="qr-placeholder" aria-hidden="true">
          <span>QQ</span>
        </div>
        <p class="note">{{ t('contribute.qqHint') }}</p>
      </section>

      <section class="panel">
        <h2>{{ t('contribute.repo') }}</h2>
        <p>
          <a :href="REPO_URL" target="_blank" rel="noopener noreferrer">
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
.contribute {
  max-width: 1080px;
  min-width: 0;
}

.hero {
  padding: 12px 0 8px;
  animation: rise 0.55s ease both;
}

.eyebrow,
.letter-title {
  margin: 0 0 8px;
  color: var(--c-star);
  letter-spacing: 0.12em;
  font-size: 12px;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 10px;
  font-size: clamp(22px, 6vw, 36px);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.25;
  background: linear-gradient(120deg, var(--c-text), var(--c-accent-soft) 55%, var(--c-star));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.greeting {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--c-accent-soft);
}

.identity {
  margin: 0 0 16px;
  max-width: 52em;
  color: var(--c-text-muted);
}

.cta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 16px;
  border-radius: $radius-sm;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: 13px;

  &:hover {
    border-color: var(--c-accent);
    color: var(--c-accent);
  }

  &.primary {
    border-color: transparent;
    background: linear-gradient(135deg, rgba(62, 207, 207, 0.28), rgba(126, 212, 192, 0.12));
    color: var(--c-accent-soft);

    &:hover {
      color: var(--c-star);
    }
  }
}

.letter {
  margin: 28px 0 36px;
  animation: rise 0.55s ease 0.08s both;

  section {
    margin-bottom: 28px;
  }

  h2 {
    margin: 0 0 12px;
    font-size: 16px;
    color: var(--c-text);
  }

  p {
    margin: 0 0 12px;
    max-width: 52em;
    color: var(--c-text-muted);
    font-size: 14px;
    line-height: 1.85;
  }
}

.challenge-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;

  @media (max-width: 719px) {
    grid-template-columns: 1fr;
  }
}

.challenge {
  padding: 18px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);

  .mark {
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    margin-bottom: 10px;
    border-radius: 50%;
    background: rgba(62, 207, 207, 0.16);
    color: var(--c-accent);
    font-size: 12px;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 15px;
    color: var(--c-accent-soft);
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.75;
  }
}

.invites {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: grid;
  gap: 14px;
}

.invite {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  padding: 18px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: linear-gradient(160deg, rgba(14, 36, 52, 0.55), rgba(14, 36, 52, 0.2));

  @media (max-width: 479px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .no {
    color: var(--c-star);
    font-size: 18px;
    letter-spacing: 0.08em;
    line-height: 1.2;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 15px;
  }

  p {
    margin: 0 0 10px;
    font-size: 13px;
    line-height: 1.75;
  }

  ul {
    margin: 0 0 10px;
    padding-left: 1.15em;
    color: var(--c-text-muted);
    font-size: 13px;
    line-height: 1.75;

    li {
      margin-bottom: 6px;
    }
  }
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;

  li {
    display: grid;
    grid-template-columns: 36px 1fr;
    gap: 10px;
    align-items: start;
    padding: 12px 14px;
    border-radius: $radius-md;
    border: 1px solid var(--c-border);
    background: var(--c-surface);
  }

  span {
    color: var(--c-accent);
    font-size: 13px;
    letter-spacing: 0.06em;
  }

  p {
    margin: 0;
    font-size: 13px;
  }
}

.needed,
.principles {
  margin: 0;
  padding-left: 1.15em;
  color: var(--c-text-muted);
  font-size: 14px;
  line-height: 1.8;

  li + li {
    margin-top: 8px;
  }
}

.faq {
  margin: 0;
  max-width: 52em;

  dt {
    margin: 0 0 6px;
    color: var(--c-accent-soft);
    font-size: 14px;
  }

  dd {
    margin: 0 0 16px;
    padding: 0;
    color: var(--c-text-muted);
    font-size: 13px;
    line-height: 1.75;
  }
}

.closing {
  margin: 8px 0 0;
  padding: 18px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background:
    linear-gradient(135deg, rgba(62, 207, 207, 0.08), transparent),
    var(--c-surface);
  color: var(--c-text) !important;
  font-size: 14px !important;
  line-height: 1.85 !important;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
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
    overflow-wrap: break-word;
  }

  > ul {
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

.ad {
  min-height: 140px;
  background:
    linear-gradient(135deg, rgba(62, 207, 207, 0.08), transparent),
    var(--c-surface);
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
