<script setup>
import { onMounted, ref } from 'vue'
import { fetchCaptcha } from '@/api/http'

const captchaId = defineModel('captchaId', { type: String, default: '' })
const captchaCode = defineModel('captchaCode', { type: String, default: '' })

const emit = defineEmits(['error'])

const imageBase64 = ref('')
const loading = ref(false)

async function refresh() {
  loading.value = true
  try {
    const data = await fetchCaptcha()
    captchaId.value = data.captchaId
    imageBase64.value = data.imageBase64
    captchaCode.value = ''
  } catch (e) {
    emit('error', e.resp || { code: -1, message: String(e.message || e) })
  } finally {
    loading.value = false
  }
}

defineExpose({ refresh })

onMounted(refresh)
</script>

<template>
  <div>
    <label>
      图片验证码
      <input v-model="captchaCode" type="text" required autocomplete="off" />
    </label>
    <img
      v-if="imageBase64"
      :src="imageBase64"
      width="120"
      height="40"
      alt="验证码"
      title="点击刷新"
      style="cursor: pointer; vertical-align: middle; margin-left: 8px"
      @click="refresh"
    />
    <button type="button" :disabled="loading" @click="refresh">刷新验证码</button>
  </div>
</template>
