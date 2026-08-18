<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getCharacterById } from '@/data/characters'
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiClockOutline, mdiLightningBolt } from '@mdi/js';
import SkillDesc from '@/components/common/SkillDesc.vue'

const route = useRoute()
const { t } = useI18n()
const character = computed(() => getCharacterById(route.params.id))
const pageBackground = computed(() => ({
  backgroundImage: `url(/imgs/characters/${character.value.id}.png)`
}))
</script>

<template>
  <div v-if="character" class="detail">
    <div class="background" :style="pageBackground"></div>
    <router-link class="back" to="/encyclopedia/characters">← {{ t('nav.characters') }}</router-link>

    <header class="hero">
      <div>
        <p class="rarity">★ {{ character.rarity }}</p>
        <h1>{{ character.name }}</h1>
        <p class="en">{{ character.nameEn }}</p>
        <p class="intro">{{ character.intro }}</p>
      </div>
      <dl class="meta">
        <div>
          <dt>{{ t('common.element') }}</dt>
          <dd>{{ character.elements.join('、') }}</dd>
        </div>
        <div>
          <dt>{{ t('common.profession') }}</dt>
          <dd>{{ character.profession }}</dd>
        </div>
        <div>
          <dt>{{ t('common.faction') }}</dt>
          <dd>{{ character.faction }}</dd>
        </div>
        <div>
          <dt>{{ t('common.race') }}</dt>
          <dd>{{ character.race }}</dd>
        </div>
        <div>
          <dt>{{ t('common.birthday') }}</dt>
          <dd>{{ character.birthday }}</dd>
        </div>
        <div>
          <dt>{{ t('common.obtain') }}</dt>
          <dd>{{ character.obtain }}</dd>
        </div>
      </dl>
    </header>

    <section v-if="character.skills?.length">
      <h2>{{ t('common.skills') }}</h2>
      <ul class="skills">
        <li v-for="(sk, i) in character.skills" :key="i">
          <strong>{{ sk.name }}</strong>
          <span class="type">{{ sk.type }}</span>
          <div v-if="sk.cooldown" class="skill-energy">
            <svg-icon type="mdi" size="14" :path="mdiClockOutline"></svg-icon>
            <span>{{ sk.cooldown }}</span>
          </div>
          <div v-if="sk.consumption" class="skill-energy">
            <svg-icon type="mdi" size="14" :path="mdiLightningBolt"></svg-icon>
            <span>{{ sk.consumption }}</span>
          </div>
          <SkillDesc>{{ sk.desc }}</SkillDesc>
          <br>
          <i v-if="sk.skillSerect">{{ sk.skillSerect }}</i>
        </li>
      </ul>
    </section>

    <section>
      <h2>{{ t('common.starGift') }}</h2>
      <p>{{ character.starGift?.join('；') || t('common.placeholder') }}</p>
    </section>

    <section>
      <h2>{{ t('common.gear') }}</h2>
      <p>{{ character.recommendedGear?.join('；') || t('common.placeholder') }}</p>
    </section>

    <section>
      <h2>{{ t('common.review') }}</h2>
      <p>{{ character.review || t('common.placeholder') }}</p>
    </section>
  </div>
  <div v-else class="missing">
    <p>{{ t('common.empty') }}</p>
    <router-link to="/encyclopedia/characters">{{ t('nav.characters') }}</router-link>
  </div>
</template>

<style scoped lang="scss">
.detail {
  position: relative;

  * {
    position: relative;
    z-index: 1;
  }

  .background {
    pointer-events: none;
    position: fixed;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    z-index: 0;
    opacity: .3;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center center;
    transition: all .2s ease-in-out;
    animation: bgFadeIn 1s ease-in-out both;

    @media (max-width: 719px) {
      background-size: cover;
      background-position: top center;
    }
  }
}

@keyframes bgFadeIn {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 0.3;
  }
}

.back {
  display: inline-block;
  margin-bottom: 16px;
  color: var(--c-text-muted);
  font-size: 13px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 20px;
  padding: 22px;
  border-radius: $radius-lg;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  margin-bottom: 24px;
  min-width: 0;

  @media (max-width: 800px) {
    grid-template-columns: minmax(0, 1fr);
    padding: 16px;
  }
}

.rarity {
  margin: 0;
  color: var(--c-star);
}

h1 {
  margin: 4px 0;
  font-size: clamp(22px, 6vw, 28px);
}

.en {
  margin: 0 0 12px;
  color: var(--c-text-muted);
}

.intro {
  margin: 0;
  line-height: 1.75;
  color: var(--c-text);
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

  p {
    margin: 0;
    color: var(--c-text-muted);
  }
}

.skills {
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
  }

  .type {
    margin-left: 8px;
    font-size: 12px;
    color: var(--c-star);
  }
}

.missing {
  text-align: center;
  padding: 60px 20px;
  color: var(--c-text-muted);
}

.skill-energy {
  gap: 4px;
  opacity: 0.6;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-left: 12px;
  margin-top: 4px;

  span {
    display: inline-block;
    margin-left: 4px;
    vertical-align: text-bottom;
  }

  svg {
    fill: currentColor;
  }
}
</style>
