<script setup>
import { onMounted } from 'vue'
import { detectBrowserLocale } from '@/i18n'
import { storageGet } from '@/utils/storage'

const props = defineProps({
  locales: { type: Object, required: true },
  modelValue: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue'])

onMounted(() => {
  // 用户已手动选过语言则尊重偏好；否则按浏览器首选语言自动切换
  if (storageGet('locale', null)) return
  const detected = detectBrowserLocale(props.locales)
  if (detected && detected !== props.modelValue) {
    emit('update:modelValue', detected)
  }
})
</script>

<template>
  <label class="lang-switcher">
    <span class="sr">Language</span>
    <select :value="modelValue" @change="emit('update:modelValue', $event.target.value)">
      <option v-for="loc in locales" :key="loc.code" :value="loc.code">
        {{ loc.nativeName }}
      </option>
    </select>
  </label>
</template>

<style scoped lang="scss">
.lang-switcher {
  display: block;
  min-width: 0;
}

.lang-switcher select {
  width: 100%;
  max-width: 11.5em;
  height: 34px;
  padding: 0 8px;
  border-radius: $radius-sm;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  cursor: pointer;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
