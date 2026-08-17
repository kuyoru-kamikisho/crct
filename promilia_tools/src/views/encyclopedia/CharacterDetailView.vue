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
</script>

<template>
  <div v-if="character" class="detail">
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
.back {
  display: inline-block;
  margin-bottom: 16px;
  color: var(--c-text-muted);
  font-size: 13px;
}

.hero {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
  padding: 22px;
  border-radius: $radius-lg;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  margin-bottom: 24px;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
}

.rarity {
  margin: 0;
  color: var(--c-star);
}

h1 {
  margin: 4px 0;
  font-size: 28px;
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
    grid-template-columns: 72px 1fr;
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
  background: rgba(14, 36, 52, 0.35);

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
  display: inline-block;
  vertical-align: middle;
  margin-left: 12px;

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
