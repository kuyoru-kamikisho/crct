<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import CaptchaField from '@/components/CaptchaField.vue'
import { api, encryptPassword, formatResult } from '@/api/http'

const route = useRoute()
const resetToken = ref(String(route.query.token || ''))
const newPassword = ref('')
const captchaId = ref('')
const captchaCode = ref('')
const result = ref('')
const captchaRef = ref(null)

async function onSubmit() {
  try {
    const cipherPassword = await encryptPassword(newPassword.value)
    const resp = await api('/api/auth/reset-password', {
      method: 'POST',
      body: {
        resetToken: resetToken.value.trim(),
        newPassword: cipherPassword,
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
    <h1>重置密码</h1>
    <p>
      <RouterLink to="/login">登录</RouterLink> |
      <RouterLink to="/forget-password">忘记密码</RouterLink>
    </p>
    <p>支持从 URL 参数 <code>?token=...</code> 自动填充重置 Token。</p>

    <form @submit.prevent="onSubmit">
      <div>
        <label>
          重置 Token
          <input v-model="resetToken" type="text" required style="width: 28em" />
        </label>
      </div>
      <div>
        <label>
          新密码（6~64）
          <input v-model="newPassword" type="password" required minlength="6" maxlength="64" />
        </label>
      </div>
      <CaptchaField
        ref="captchaRef"
        v-model:captcha-id="captchaId"
        v-model:captcha-code="captchaCode"
        @error="(r) => (result = formatResult(r))"
      />
      <div>
        <button type="submit">重置密码</button>
      </div>
    </form>

    <h2>响应</h2>
    <pre>{{ result }}</pre>
  </div>
</template>
