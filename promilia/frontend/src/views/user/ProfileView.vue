<script setup>
import { computed, onMounted, ref } from 'vue'
import CaptchaField from '@/components/CaptchaField.vue'
import { api, assetUrl, clearToken, encryptPassword, formatResult, getToken } from '@/api/http'

const result = ref('')
const profileJson = ref('')
const tokenPreview = computed(() => {
  const t = getToken()
  return t ? `${t.slice(0, 16)}...` : '(无)'
})

const ipLocation = ref('-')
const loginIpsText = ref('-')
const avatarUrl = ref('')
const signature = ref('')
const birthday = ref('')
const gender = ref(0)
const avatarFile = ref(null)

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const pwdCaptchaId = ref('')
const pwdCaptchaCode = ref('')
const pwdCaptchaRef = ref(null)

function applyProfile(data) {
  if (!data) return
  signature.value = data.signature || ''
  birthday.value = data.birthday || ''
  gender.value = data.gender == null ? 0 : data.gender
  ipLocation.value = data.ipLocation || '未知'
  const ips = data.loginIps || []
  loginIpsText.value = ips.length ? ips.join(', ') : '(暂无)'
  avatarUrl.value = data.avatarUrl ? assetUrl(data.avatarUrl) : ''
  profileJson.value = formatResult(data)
}

async function loadProfile() {
  if (!getToken()) {
    result.value = formatResult({ code: 40100, message: '未登录：请先在登录页获取 Token' })
    return
  }
  try {
    const resp = await api('/api/user/profile', { auth: true })
    result.value = formatResult(resp)
    if (resp.code === 0 && resp.data) applyProfile(resp.data)
  } catch (e) {
    result.value = formatResult({ code: -1, message: String(e.message || e) })
  }
}

function onLogout() {
  clearToken()
  profileJson.value = ''
  avatarUrl.value = ''
  ipLocation.value = '-'
  loginIpsText.value = '-'
  result.value = formatResult({ message: '本地 Token 已清除' })
}

async function onUpdate() {
  try {
    const body = {
      signature: signature.value,
      gender: Number(gender.value),
      birthday: birthday.value || null,
    }
    const resp = await api('/api/user/profile', {
      method: 'PUT',
      auth: true,
      body,
    })
    result.value = formatResult(resp)
    if (resp.code === 0 && resp.data) applyProfile(resp.data)
  } catch (e) {
    result.value = formatResult({ code: -1, message: String(e.message || e) })
  }
}

async function onUploadAvatar() {
  if (!avatarFile.value) {
    result.value = formatResult({ code: -1, message: '请选择文件' })
    return
  }
  try {
    const formData = new FormData()
    formData.append('file', avatarFile.value)
    const resp = await api('/api/user/avatar', {
      method: 'POST',
      auth: true,
      raw: true,
      body: formData,
    })
    result.value = formatResult(resp)
    if (resp.code === 0) await loadProfile()
  } catch (e) {
    result.value = formatResult({ code: -1, message: String(e.message || e) })
  }
}

function onAvatarChange(e) {
  avatarFile.value = e.target.files?.[0] || null
}

async function onChangePassword() {
  if (!getToken()) {
    result.value = formatResult({ code: 40100, message: '未登录：请先在登录页获取 Token' })
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    result.value = formatResult({ code: -1, message: '两次输入的新密码不一致' })
    return
  }
  try {
    const [oldCipher, newCipher] = await Promise.all([
      encryptPassword(oldPassword.value),
      encryptPassword(newPassword.value),
    ])
    const resp = await api('/api/user/password', {
      method: 'POST',
      auth: true,
      body: {
        oldPassword: oldCipher,
        newPassword: newCipher,
        captchaId: pwdCaptchaId.value,
        captchaCode: pwdCaptchaCode.value.trim(),
      },
    })
    result.value = formatResult(resp)
    await pwdCaptchaRef.value?.refresh()
    if (resp.code === 0) {
      oldPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    }
  } catch (e) {
    result.value = formatResult({ code: -1, message: String(e.message || e) })
    await pwdCaptchaRef.value?.refresh()
  }
}

onMounted(loadProfile)
</script>

<template>
  <div>
    <h1>个人信息</h1>
    <p>
      <RouterLink to="/login">登录</RouterLink> |
      <button type="button" @click="onLogout">清除本地 Token（登出）</button>
    </p>
    <p>当前 Token：<code>{{ tokenPreview }}</code></p>

    <h2>1. 查询资料</h2>
    <button type="button" @click="loadProfile">刷新资料</button>
    <p>
      所在地（社区展示）：
      <strong>{{ ipLocation }}</strong>
    </p>
    <p>登录 IP 记录（最新在前，最多 10 条）：<code>{{ loginIpsText }}</code></p>
    <div>
      <img v-if="avatarUrl" :src="avatarUrl" alt="头像" width="80" height="80" />
    </div>
    <pre>{{ profileJson }}</pre>

    <h2>2. 更新资料</h2>
    <form @submit.prevent="onUpdate">
      <div>
        <label>
          个性签名（最多 50 字）
          <input v-model="signature" type="text" maxlength="50" style="width: 24em" />
        </label>
      </div>
      <div>
        <label>生日 <input v-model="birthday" type="date" /></label>
      </div>
      <div>
        <label>
          性别
          <select v-model.number="gender">
            <option :value="0">未知 (0)</option>
            <option :value="1">男 (1)</option>
            <option :value="2">女 (2)</option>
          </select>
        </label>
      </div>
      <div>
        <button type="submit">保存资料</button>
      </div>
    </form>

    <h2>3. 上传头像</h2>
    <form @submit.prevent="onUploadAvatar">
      <div>
        <label>头像文件 <input type="file" accept="image/*" required @change="onAvatarChange" /></label>
      </div>
      <div>
        <button type="submit">上传</button>
      </div>
    </form>

    <h2>4. 修改密码</h2>
    <form @submit.prevent="onChangePassword">
      <div>
        <label>旧密码 <input v-model="oldPassword" type="password" required /></label>
      </div>
      <div>
        <label>
          新密码（6~64）
          <input v-model="newPassword" type="password" required minlength="6" maxlength="64" />
        </label>
      </div>
      <div>
        <label>
          确认新密码
          <input v-model="confirmPassword" type="password" required minlength="6" maxlength="64" />
        </label>
      </div>
      <CaptchaField
        ref="pwdCaptchaRef"
        v-model:captcha-id="pwdCaptchaId"
        v-model:captcha-code="pwdCaptchaCode"
        @error="(r) => (result = formatResult(r))"
      />
      <div>
        <button type="submit">修改密码</button>
      </div>
    </form>

    <h2>响应</h2>
    <pre>{{ result }}</pre>
  </div>
</template>
