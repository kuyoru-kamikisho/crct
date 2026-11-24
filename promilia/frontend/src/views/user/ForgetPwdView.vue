<script setup>
import { ref } from 'vue'
import CaptchaField from '@/components/CaptchaField.vue'
import { api, formatResult } from '@/api/http'

const email = ref('')
const captchaId = ref('')
const captchaCode = ref('')
const result = ref('')
const captchaRef = ref(null)

async function onSubmit() {
  try {
    const resp = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        captchaId: captchaId.value,
        captchaCode: captchaCode.value.trim(),
      },
    })
    result.value = formatResult(resp)
    await captchaRef.value?.refresh()
  } catch (e) {
    result.value = formatResult({ code: -1, message: String(e.message || e) })
  }
}
</script>

<template>
  <div>
    <h1>忘记密码</h1>
    <p>
      <RouterLink to="/login">登录</RouterLink> |
      <RouterLink to="/reset-password">重置密码</RouterLink>
    </p>
    <p>提交成功后，重置链接会发到邮箱。链接中的 token 可粘贴到「重置密码」页。</p>

    <form @submit.prevent="onSubmit">
      <div>
        <label>邮箱 <input v-model="email" type="email" required /></label>
      </div>
      <CaptchaField
        ref="captchaRef"
        v-model:captcha-id="captchaId"
        v-model:captcha-code="captchaCode"
        @error="(r) => (result = formatResult(r))"
      />
      <div>
        <button type="submit">发送重置邮件</button>
      </div>
    </form>

    <h2>响应</h2>
    <pre>{{ result }}</pre>
  </div>
</template>
