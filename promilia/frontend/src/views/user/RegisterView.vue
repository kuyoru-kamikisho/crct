<script setup>
import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CaptchaField from '@/components/CaptchaField.vue'
import { api, encryptPassword, formatResult } from '@/api/http'

const SEND_INTERVAL_SECONDS = 60
const router = useRouter()

const email = ref('')
const nickname = ref('')
const captchaId = ref('')
const captchaCode = ref('')
const emailCode = ref('')
const password = ref('')
const result = ref('')
const captchaRef = ref(null)

const sendDisabled = ref(false)
const sendBtnText = ref('发送邮箱验证码')
const sendHint = ref('')
let countdownTimer = null
let countdownLeft = 0

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  countdownLeft = 0
  sendDisabled.value = false
  sendBtnText.value = '发送邮箱验证码'
  sendHint.value = ''
}

function tickCountdown() {
  if (countdownLeft <= 0) {
    stopCountdown()
    return
  }
  sendDisabled.value = true
  sendBtnText.value = `重新发送（${countdownLeft}s）`
  sendHint.value = `同一邮箱 ${SEND_INTERVAL_SECONDS} 秒内只能发送一次`
  countdownLeft -= 1
}

function startCountdown(seconds) {
  stopCountdown()
  countdownLeft = Math.max(1, seconds | 0)
  tickCountdown()
  countdownTimer = setInterval(tickCountdown, 1000)
}

onUnmounted(stopCountdown)

async function onSendCode() {
  if (sendDisabled.value) return
  sendDisabled.value = true
  try {
    const resp = await api('/api/auth/register/send-code', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        nickname: nickname.value.trim(),
        captchaId: captchaId.value,
        captchaCode: captchaCode.value.trim(),
      },
    })
    result.value = formatResult(resp)
    await captchaRef.value?.refresh()

    if (resp.code === 40005 || resp.code === 40012) {
      sendHint.value = resp.message || '该邮箱不可注册'
      sendDisabled.value = false
      return
    }
    if (resp.code === 0 || resp.code === 40003) {
      startCountdown(SEND_INTERVAL_SECONDS)
    } else {
      sendDisabled.value = false
    }
  } catch (e) {
    result.value = formatResult({ code: -1, message: String(e.message || e) })
    sendDisabled.value = false
  }
}

async function onRegister() {
  try {
    const cipherPassword = await encryptPassword(password.value)
    const resp = await api('/api/auth/register', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        nickname: nickname.value.trim(),
        emailCode: emailCode.value.trim(),
        password: cipherPassword,
      },
    })
    result.value = formatResult(resp)
    if (resp.code === 0) {
      router.push('/login')
    }
  } catch (e) {
    result.value = formatResult({ code: -1, message: String(e.message || e) })
  }
}
</script>

<template>
  <div>
    <h1>注册</h1>
    <p>
      <RouterLink to="/login">登录</RouterLink> |
      <RouterLink to="/forget-password">忘记密码</RouterLink>
    </p>

    <h2>1. 发送邮箱验证码</h2>
    <form @submit.prevent="onSendCode">
      <div>
        <label>邮箱 <input v-model="email" type="email" required /></label>
      </div>
      <div>
        <label>
          昵称
          <input v-model="nickname" type="text" required minlength="2" maxlength="32" />
        </label>
      </div>
      <CaptchaField
        ref="captchaRef"
        v-model:captcha-id="captchaId"
        v-model:captcha-code="captchaCode"
        @error="(r) => (result = formatResult(r))"
      />
      <div>
        <button type="submit" :disabled="sendDisabled">{{ sendBtnText }}</button>
        <span style="margin-left: 8px; color: #666">{{ sendHint }}</span>
      </div>
    </form>

    <h2>2. 确认注册</h2>
    <form @submit.prevent="onRegister">
      <div>
        <label>
          邮箱验证码（6 位）
          <input v-model="emailCode" type="text" required minlength="6" maxlength="6" />
        </label>
      </div>
      <div>
        <label>
          密码（6~64）
          <input v-model="password" type="password" required minlength="6" maxlength="64" />
        </label>
      </div>
      <div>
        <button type="submit">注册</button>
      </div>
    </form>

    <h2>响应</h2>
    <pre>{{ result }}</pre>
  </div>
</template>
