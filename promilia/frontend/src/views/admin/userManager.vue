<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, assetUrl, getToken } from '@/api/http'

const router = useRouter()
const allowed = ref(false)
const loading = ref(false)
const message = ref('')
const keyword = ref('')
const page = ref(1)
const size = ref(20)
const total = ref(0)
const users = ref([])

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/profile')
  }
}

/** 进入页时校验当前登录用户是否为管理员（role === 1） */
async function ensureAdmin() {
  if (!getToken()) {
    goBack()
    return false
  }
  try {
    const resp = await api('/api/user/profile', { auth: true })
    if (resp.code !== 0 || !resp.data || resp.data.role !== 1) {
      goBack()
      return false
    }
    allowed.value = true
    return true
  } catch {
    goBack()
    return false
  }
}

const editForm = reactive({
  id: null,
  nickname: '',
  signature: '',
  birthday: '',
  gender: 0,
  role: 0,
})

const banForm = reactive({
  id: null,
  email: '',
  reason: '',
  banUntil: '',
  permanent: false,
})

const avatarFile = ref(null)

function showMsg(text) {
  message.value = text
}

function roleLabel(role) {
  return role === 1 ? '管理员' : '普通用户'
}

async function loadUsers() {
  if (!getToken()) {
    showMsg('未登录：请先在登录页获取管理员 Token')
    return
  }
  loading.value = true
  try {
    const q = new URLSearchParams({
      page: String(page.value),
      size: String(size.value),
    })
    if (keyword.value.trim()) q.set('keyword', keyword.value.trim())
    const resp = await api(`/api/admin/users?${q}`, { auth: true })
    if (resp.code !== 0) {
      showMsg(resp.message || '加载失败')
      return
    }
    users.value = resp.data?.records || []
    total.value = resp.data?.total || 0
    showMsg(`共 ${total.value} 个用户`)
  } catch (e) {
    showMsg(String(e.message || e))
  } finally {
    loading.value = false
  }
}

function openEdit(u) {
  editForm.id = u.id
  editForm.nickname = u.nickname || ''
  editForm.signature = u.signature || ''
  editForm.birthday = u.birthday || ''
  editForm.gender = u.gender ?? 0
  editForm.role = u.role ?? 0
  avatarFile.value = null
}

function openBan(u) {
  banForm.id = u.id
  banForm.email = u.email
  banForm.reason = ''
  banForm.banUntil = ''
  banForm.permanent = false
}

async function saveUser() {
  if (!editForm.id) return
  const body = {
    nickname: editForm.nickname,
    signature: editForm.signature,
    gender: Number(editForm.gender),
    role: Number(editForm.role),
  }
  if (editForm.birthday) body.birthday = editForm.birthday
  const resp = await api(`/api/admin/users/${editForm.id}`, {
    method: 'PUT',
    auth: true,
    body,
  })
  showMsg(resp.message || JSON.stringify(resp))
  if (resp.code === 0) {
    await loadUsers()
  }
}

async function uploadAvatar() {
  if (!editForm.id || !avatarFile.value) {
    showMsg('请先选择用户和头像文件')
    return
  }
  const fd = new FormData()
  fd.append('file', avatarFile.value)
  const resp = await api(`/api/admin/users/${editForm.id}/avatar`, {
    method: 'POST',
    auth: true,
    raw: true,
    body: fd,
  })
  showMsg(resp.message || JSON.stringify(resp))
  if (resp.code === 0) await loadUsers()
}

async function banUser() {
  if (!banForm.id) return
  if (!banForm.reason.trim()) {
    showMsg('请填写禁用理由')
    return
  }
  const body = { reason: banForm.reason.trim() }
  if (!banForm.permanent) {
    if (!banForm.banUntil) {
      showMsg('请设置禁用截止时间，或勾选永久禁用')
      return
    }
    // datetime-local → ISO local without Z
    body.banUntil = banForm.banUntil.length === 16 ? banForm.banUntil + ':00' : banForm.banUntil
  }
  const resp = await api(`/api/admin/users/${banForm.id}/ban`, {
    method: 'POST',
    auth: true,
    body,
  })
  showMsg(resp.message || JSON.stringify(resp))
  if (resp.code === 0) {
    banForm.id = null
    await loadUsers()
  }
}

async function unbanUser(u) {
  if (!confirm(`确认解封 ${u.email}？`)) return
  const resp = await api(`/api/admin/users/${u.id}/unban`, { method: 'POST', auth: true })
  showMsg(resp.message || JSON.stringify(resp))
  if (resp.code === 0) await loadUsers()
}

async function deleteUser(u) {
  if (!confirm(`确认删除用户 ${u.email}（${u.nickname}）？此操作不可恢复。`)) return
  const resp = await api(`/api/admin/users/${u.id}`, { method: 'DELETE', auth: true })
  showMsg(resp.message || JSON.stringify(resp))
  if (resp.code === 0) await loadUsers()
}

function onAvatarChange(e) {
  avatarFile.value = e.target.files?.[0] || null
}

function prevPage() {
  if (page.value > 1) {
    page.value -= 1
    loadUsers()
  }
}

function nextPage() {
  if (page.value * size.value < total.value) {
    page.value += 1
    loadUsers()
  }
}

onMounted(async () => {
  if (await ensureAdmin()) {
    await loadUsers()
  }
})
</script>

<template>
  <div v-if="allowed">
    <h1>用户管理</h1>
    <p>
      <RouterLink to="/login">登录页</RouterLink> |
      <RouterLink to="/profile">个人资料</RouterLink>
    </p>
    <p v-if="message"><strong>提示：</strong>{{ message }}</p>

    <section>
      <h2>用户列表</h2>
      <div>
        <input v-model="keyword" placeholder="搜索邮箱/昵称" @keyup.enter="page = 1; loadUsers()" />
        <button type="button" :disabled="loading" @click="page = 1; loadUsers()">查询</button>
        <button type="button" :disabled="loading" @click="loadUsers()">刷新</button>
      </div>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead>
          <tr>
            <th>ID</th>
            <th>头像</th>
            <th>邮箱</th>
            <th>昵称</th>
            <th>角色</th>
            <th>所在地</th>
            <th>登录IP(最新)</th>
            <th>禁用</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.id }}</td>
            <td>
              <img v-if="u.avatarUrl" :src="assetUrl(u.avatarUrl)" alt="" width="40" height="40" />
              <span v-else>-</span>
            </td>
            <td>{{ u.email }}</td>
            <td>{{ u.nickname }}</td>
            <td>{{ roleLabel(u.role) }}</td>
            <td>{{ u.ipLocation || '-' }}</td>
            <td>{{ (u.loginIps && u.loginIps[0]) || '-' }}</td>
            <td>
              <template v-if="u.banned">
                是
                <div v-if="u.banReason">理由：{{ u.banReason }}</div>
                <div>至：{{ u.banUntil || '永久' }}</div>
              </template>
              <template v-else>否</template>
            </td>
            <td>
              <button type="button" @click="openEdit(u)">编辑</button>
              <button type="button" @click="openBan(u)">禁用</button>
              <button v-if="u.banned" type="button" @click="unbanUser(u)">解封</button>
              <button type="button" @click="deleteUser(u)">删除</button>
            </td>
          </tr>
          <tr v-if="!users.length">
            <td colspan="9">暂无数据</td>
          </tr>
        </tbody>
      </table>
      <div>
        <button type="button" @click="prevPage">上一页</button>
        第 {{ page }} 页 / 每页 {{ size }} / 共 {{ total }}
        <button type="button" @click="nextPage">下一页</button>
      </div>
    </section>

    <section v-if="editForm.id">
      <h2>编辑用户 #{{ editForm.id }}</h2>
      <div>
        <label>昵称 <input v-model="editForm.nickname" /></label>
      </div>
      <div>
        <label>签名 <input v-model="editForm.signature" maxlength="50" /></label>
      </div>
      <div>
        <label>生日 <input v-model="editForm.birthday" type="date" /></label>
      </div>
      <div>
        <label>
          性别
          <select v-model.number="editForm.gender">
            <option :value="0">未知</option>
            <option :value="1">男</option>
            <option :value="2">女</option>
          </select>
        </label>
      </div>
      <div>
        <label>
          角色
          <select v-model.number="editForm.role">
            <option :value="0">普通用户</option>
            <option :value="1">管理员</option>
          </select>
        </label>
      </div>
      <div>
        <label>更换头像 <input type="file" accept="image/*" @change="onAvatarChange" /></label>
        <button type="button" @click="uploadAvatar">上传头像</button>
      </div>
      <div>
        <button type="button" @click="saveUser">保存资料</button>
        <button type="button" @click="editForm.id = null">取消</button>
      </div>
    </section>

    <section v-if="banForm.id">
      <h2>禁用账号：{{ banForm.email }}</h2>
      <p>禁用针对邮箱：到期前不可登录，也不可再次注册。</p>
      <div>
        <label>禁用理由 <input v-model="banForm.reason" style="width: 28em" required /></label>
      </div>
      <div>
        <label>
          <input v-model="banForm.permanent" type="checkbox" />
          永久禁用
        </label>
      </div>
      <div v-if="!banForm.permanent">
        <label>
          禁用截止时间
          <input v-model="banForm.banUntil" type="datetime-local" />
        </label>
      </div>
      <div>
        <button type="button" @click="banUser">确认禁用</button>
        <button type="button" @click="banForm.id = null">取消</button>
      </div>
    </section>
  </div>
</template>
