<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import CaptchaField from '@/components/CaptchaField.vue'
import { api, encryptPassword, formatResult, setToken } from '@/api/http'

const router = useRouter()
const email = ref('')
const password = ref('')
const captchaId = ref('')
const captchaCode = ref('')
const result = ref('')
const captchaRef = ref(null)

async function onSubmit() {
  try {
    const cipherPassword = await encryptPassword(password.value)
    const resp = await api('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        password: cipherPassword,
        captchaId: captchaId.value,
        captchaCode: captchaCode.value.trim(),
      },
    })
    result.value = formatResult(resp)
    if (resp.code === 0 && resp.data?.token) {
      setToken(resp.data.token)
      router.push('/profile')
      return
    }
    await captchaRef.value?.refresh()
  } catch (e) {
    result.value = formatResult({ code: -1, message: String(e.message || e) })
  }
}
</script>

<template>
  <div>
    <h1>登录</h1>
    <p>
      <RouterLink to="/register">注册</RouterLink> |
      <RouterLink to="/forget-password">忘记密码</RouterLink> |
      <RouterLink to="/profile">个人信息</RouterLink> |
      <RouterLink to="/admin/users">用户管理(管理员)</RouterLink>
    </p>

    <form @submit.prevent="onSubmit">
      <div>
        <label>邮箱 <input v-model="email" type="email" required /></label>
      </div>
      <div>
        <label>密码 <input v-model="password" type="password" required /></label>
      </div>
      <CaptchaField
        ref="captchaRef"
        v-model:captcha-id="captchaId"
        v-model:captcha-code="captchaCode"
        @error="(r) => (result = formatResult(r))"
      />
      <div>
        <button type="submit">登录</button>
      </div>
    </form>

    <h2>响应</h2>
    <pre>{{ result }}</pre>
  </div>
</template>
