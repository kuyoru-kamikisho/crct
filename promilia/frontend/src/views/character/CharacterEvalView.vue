<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, assetUrl, getToken } from '@/api/http'

const router = useRouter()
const message = ref('')
const isAdmin = ref(false)
const characters = ref([])
const cupSizes = ref([])
const races = ref([])

const addForm = reactive({
  name: '',
  gender: 2,
  image: null,
})

const editModal = reactive({
  open: false,
  characterId: null,
  characterName: '',
  fieldType: '',
  fieldLabel: '',
  value: '',
  source: '',
  ratingStars: 5,
})

const detailModal = reactive({
  open: false,
  loading: false,
  data: null,
  commentText: '',
  commentImages: [],
  voteBusy: false,
})

const commentInputRef = ref(null)

const FIELD_LABELS = {
  HEIGHT: '身高',
  WEIGHT: '体重',
  MEASUREMENTS: '三围',
  CUP_SIZE: '大小',
  RACE: '种族',
  BIRTHDAY: '生日',
  RATING: '评分',
}

function showMsg(text) {
  message.value = text
}

function genderLabel(g) {
  if (g === 1) return '男'
  if (g === 2) return '女'
  return '未知'
}

function starText(rating) {
  if (!rating) return '-'
  const n = Number(rating)
  if (Number.isNaN(n)) return rating
  const full = Math.round(n)
  return `${'★'.repeat(Math.min(5, Math.max(0, full)))}${'☆'.repeat(Math.max(0, 5 - full))} (${Number(rating).toFixed(1)})`
}

async function ensureLogin() {
  if (!getToken()) {
    router.replace('/login')
    return false
  }
  const resp = await api('/api/user/profile', { auth: true })
  if (resp.code !== 0) {
    router.replace('/login')
    return false
  }
  isAdmin.value = resp.data?.role === 1
  return true
}

async function loadMeta() {
  const resp = await api('/api/characters/meta', { auth: true })
  if (resp.code === 0 && resp.data) {
    cupSizes.value = resp.data.cupSizes || []
    races.value = resp.data.races || []
  }
}

async function loadList() {
  const resp = await api('/api/characters', { auth: true })
  if (resp.code !== 0) {
    showMsg(resp.message || '加载失败')
    return
  }
  characters.value = resp.data || []
}

async function createCharacter() {
  if (!addForm.name.trim()) {
    showMsg('请填写角色名')
    return
  }
  const fd = new FormData()
  fd.append('name', addForm.name.trim())
  fd.append('gender', String(addForm.gender))
  if (addForm.image) fd.append('image', addForm.image)
  const resp = await api('/api/admin/characters', { method: 'POST', auth: true, raw: true, body: fd })
  showMsg(resp.message || (resp.code === 0 ? '添加成功' : '添加失败'))
  if (resp.code === 0) {
    addForm.name = ''
    addForm.image = null
    await loadList()
  }
}

async function deleteCharacter(row) {
  if (!confirm(`确认删除角色「${row.name}」？`)) return
  const resp = await api(`/api/admin/characters/${row.id}`, { method: 'DELETE', auth: true })
  showMsg(resp.message || (resp.code === 0 ? '已删除' : '删除失败'))
  if (resp.code === 0) await loadList()
}

function openEdit(row, fieldType) {
  editModal.open = true
  editModal.characterId = row.id
  editModal.characterName = row.name
  editModal.fieldType = fieldType
  editModal.fieldLabel = FIELD_LABELS[fieldType] || fieldType
  editModal.value = ''
  editModal.source = ''
  editModal.ratingStars = 5
  if (fieldType === 'CUP_SIZE') editModal.value = cupSizes.value[0] || 'A'
  if (fieldType === 'RACE') editModal.value = races.value[0] || '人类'
  if (fieldType === 'RATING') editModal.value = '5.0'
}

function closeEdit() {
  editModal.open = false
}

function setRatingStars(n) {
  editModal.ratingStars = n
  editModal.value = n.toFixed(1)
}

async function submitField() {
  let value = editModal.value
  if (editModal.fieldType === 'RATING') {
    value = Number(editModal.ratingStars).toFixed(1)
  }
  if (!String(value).trim()) {
    showMsg('请填写数值')
    return
  }
  if (!editModal.source.trim()) {
    showMsg('请填写数据出处')
    return
  }
  const resp = await api(`/api/characters/${editModal.characterId}/fields`, {
    method: 'POST',
    auth: true,
    body: {
      fieldType: editModal.fieldType,
      value: String(value).trim(),
      source: editModal.source.trim(),
    },
  })
  showMsg(resp.message || (resp.code === 0 ? '提交成功' : '提交失败'))
  if (resp.code === 0) {
    closeEdit()
    await loadList()
    if (detailModal.open && detailModal.data?.id === editModal.characterId) {
      await openDetail({ id: editModal.characterId })
    }
  }
}

async function openDetail(row) {
  detailModal.open = true
  detailModal.loading = true
  detailModal.commentText = ''
  detailModal.commentImages = []
  detailModal.data = null
  const resp = await api(`/api/characters/${row.id}`, { auth: true })
  detailModal.loading = false
  if (resp.code !== 0) {
    showMsg(resp.message || '加载详情失败')
    detailModal.open = false
    return
  }
  detailModal.data = resp.data
}

function closeDetail() {
  detailModal.open = false
}

const submittedSet = computed(() => new Set(detailModal.data?.mySubmittedFields || []))

async function voteSource(fieldValueId, score) {
  detailModal.voteBusy = true
  const resp = await api(`/api/characters/fields/${fieldValueId}/vote`, {
    method: 'POST',
    auth: true,
    body: { score },
  })
  detailModal.voteBusy = false
  showMsg(resp.message || (resp.code === 0 ? '打分成功' : '打分失败'))
  if (resp.code === 0 && detailModal.data) {
    await openDetail({ id: detailModal.data.id })
    await loadList()
  }
}

async function sendComment() {
  const text = detailModal.commentText.trim()
  if (!text) {
    showMsg('请输入评价内容')
    return
  }
  if ([...text].length > 2000) {
    showMsg('评价不能超过 2000 字')
    return
  }
  const resp = await api(`/api/characters/${detailModal.data.id}/comments`, {
    method: 'POST',
    auth: true,
    body: {
      contentText: text,
      images: detailModal.commentImages,
    },
  })
  showMsg(resp.message || (resp.code === 0 ? '发送成功' : '发送失败'))
  if (resp.code === 0) {
    detailModal.commentText = ''
    detailModal.commentImages = []
    await openDetail({ id: detailModal.data.id })
  }
}

async function onPasteComment(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (!item.type.startsWith('image/')) continue
    e.preventDefault()
    const file = item.getAsFile()
    if (!file) continue
    const fd = new FormData()
    fd.append('file', file)
    const resp = await api('/api/characters/comment-images', {
      method: 'POST',
      auth: true,
      raw: true,
      body: fd,
    })
    if (resp.code === 0 && resp.data?.url) {
      detailModal.commentImages.push(resp.data.url)
      showMsg('已粘贴图片，可继续输入文字后发送')
    } else {
      showMsg(resp.message || '图片上传失败')
    }
  }
}

function removeCommentImage(idx) {
  detailModal.commentImages.splice(idx, 1)
}

function onAddImageChange(e) {
  addForm.image = e.target.files?.[0] || null
}

onMounted(async () => {
  if (!(await ensureLogin())) return
  await loadMeta()
  await loadList()
})
</script>

<template>
  <div>
    <h1>角色评价</h1>
    <p>
      <RouterLink to="/profile">个人资料</RouterLink> |
      <RouterLink to="/admin/users">用户管理</RouterLink>
    </p>
    <p v-if="message"><strong>提示：</strong>{{ message }}</p>
    <p>表格展示大众认可度最高的投稿值；点击单元格可投稿（每人每项仅一次，需填写出处）。</p>

    <section v-if="isAdmin" style="margin-bottom: 1em">
      <h2>添加角色（管理员）</h2>
      <div>
        <label>角色名 <input v-model="addForm.name" /></label>
        <label>
          性别
          <select v-model.number="addForm.gender">
            <option :value="0">未知</option>
            <option :value="1">男</option>
            <option :value="2">女</option>
          </select>
        </label>
        <label>图片 <input type="file" accept="image/*" @change="onAddImageChange" /></label>
        <button type="button" @click="createCharacter">添加</button>
      </div>
    </section>

    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr>
          <th>角色图片</th>
          <th>角色名</th>
          <th>性别</th>
          <th>身高</th>
          <th>体重</th>
          <th>三围</th>
          <th>大小</th>
          <th>种族</th>
          <th>生日</th>
          <th>评分</th>
          <th>评价</th>
          <th v-if="isAdmin">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in characters" :key="row.id">
          <td>
            <img v-if="row.imageUrl" :src="assetUrl(row.imageUrl)" alt="" width="48" height="48" />
            <span v-else>-</span>
          </td>
          <td>{{ row.name }}</td>
          <td>{{ genderLabel(row.gender) }}</td>
          <td>
            <button type="button" @click="openEdit(row, 'HEIGHT')">{{ row.height || '编辑' }}</button>
          </td>
          <td>
            <button type="button" @click="openEdit(row, 'WEIGHT')">{{ row.weight || '编辑' }}</button>
          </td>
          <td>
            <button type="button" @click="openEdit(row, 'MEASUREMENTS')">{{ row.measurements || '编辑' }}</button>
          </td>
          <td>
            <button type="button" @click="openEdit(row, 'CUP_SIZE')">{{ row.cupSize || '编辑' }}</button>
          </td>
          <td>
            <button type="button" @click="openEdit(row, 'RACE')">{{ row.race || '编辑' }}</button>
          </td>
          <td>
            <button type="button" @click="openEdit(row, 'BIRTHDAY')">{{ row.birthdayDisplay || '编辑' }}</button>
          </td>
          <td>
            <button type="button" @click="openEdit(row, 'RATING')">{{ starText(row.rating) }}</button>
          </td>
          <td>
            <button type="button" @click="openDetail(row)">查看评价</button>
          </td>
          <td v-if="isAdmin">
            <button type="button" @click="deleteCharacter(row)">删除</button>
          </td>
        </tr>
        <tr v-if="!characters.length">
          <td :colspan="isAdmin ? 12 : 11">暂无角色</td>
        </tr>
      </tbody>
    </table>

    <!-- 编辑字段弹窗 -->
    <div
      v-if="editModal.open"
      style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; z-index: 20"
    >
      <div style="background: #fff; padding: 16px; min-width: 320px; max-width: 90vw">
        <h3>编辑 {{ editModal.characterName }} · {{ editModal.fieldLabel }}</h3>
        <p>每人每项仅可提交一次，请填写数据出处。</p>

        <div v-if="editModal.fieldType === 'RATING'">
          <span
            v-for="n in 5"
            :key="n"
            style="cursor: pointer; font-size: 28px; margin-right: 4px"
            @click="setRatingStars(n)"
          >{{ n <= editModal.ratingStars ? '★' : '☆' }}</span>
          <span>{{ editModal.ratingStars.toFixed(1) }}</span>
        </div>
        <div v-else-if="editModal.fieldType === 'CUP_SIZE'">
          <label>
            大小
            <select v-model="editModal.value">
              <option v-for="c in cupSizes" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
        </div>
        <div v-else-if="editModal.fieldType === 'RACE'">
          <label>
            种族
            <select v-model="editModal.value">
              <option v-for="r in races" :key="r" :value="r">{{ r }}</option>
            </select>
          </label>
        </div>
        <div v-else-if="editModal.fieldType === 'BIRTHDAY'">
          <label>
            生日（月-日，如 1-1）
            <input v-model="editModal.value" placeholder="1-1" />
          </label>
        </div>
        <div v-else-if="editModal.fieldType === 'MEASUREMENTS'">
          <label>
            三围（如 90/60/90）
            <input v-model="editModal.value" inputmode="decimal" placeholder="90/60/90" />
          </label>
        </div>
        <div v-else-if="editModal.fieldType === 'HEIGHT' || editModal.fieldType === 'WEIGHT'">
          <label>
            {{ editModal.fieldLabel }}（数字，单位 {{ editModal.fieldType === 'HEIGHT' ? 'cm' : 'kg' }}）
            <input v-model="editModal.value" type="number" step="any" min="0" />
          </label>
        </div>

        <div style="margin-top: 8px">
          <label>
            数据出处（必填）
            <input v-model="editModal.source" style="width: 100%" maxlength="512" />
          </label>
        </div>
        <div style="margin-top: 12px">
          <button type="button" @click="submitField">保存</button>
          <button type="button" @click="closeEdit">取消</button>
        </div>
      </div>
    </div>

    <!-- 评价详情弹窗 -->
    <div
      v-if="detailModal.open"
      style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; z-index: 30"
    >
      <div style="background: #fff; padding: 16px; width: min(900px, 96vw); max-height: 90vh; overflow: auto">
        <div style="display: flex; justify-content: space-between; align-items: center">
          <h3 v-if="detailModal.data">{{ detailModal.data.name }} · 评价与数据出处</h3>
          <button type="button" @click="closeDetail">关闭</button>
        </div>
        <p v-if="detailModal.loading">加载中…</p>
        <template v-else-if="detailModal.data">
          <section v-for="(list, fieldKey) in detailModal.data.fieldValues" :key="fieldKey" style="margin-bottom: 12px">
            <h4>{{ FIELD_LABELS[fieldKey] || fieldKey }}</h4>
            <p v-if="!list.length">暂无投稿</p>
            <table v-else border="1" cellpadding="4" cellspacing="0" style="width: 100%">
              <thead>
                <tr>
                  <th>数值</th>
                  <th>出处</th>
                  <th>投稿人</th>
                  <th>均分</th>
                  <th>票数</th>
                  <th>我对出处打分</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in list" :key="item.id">
                  <td>{{ item.displayValue || item.valueText }}</td>
                  <td>{{ item.source }}</td>
                  <td>{{ item.nickname }}</td>
                  <td>{{ item.avgScore.toFixed(1) }}</td>
                  <td>{{ item.voteCount }}</td>
                  <td>
                    <template v-if="item.myVote">已评 {{ item.myVote }}</template>
                    <template v-else>
                      <button
                        v-for="s in 5"
                        :key="s"
                        type="button"
                        :disabled="detailModal.voteBusy"
                        @click="voteSource(item.id, s)"
                      >{{ s }}★</button>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="submittedSet.has(fieldKey)">你已提交过该项</p>
            <button
              v-else
              type="button"
              @click="openEdit({ id: detailModal.data.id, name: detailModal.data.name }, fieldKey)"
            >投稿该项</button>
          </section>

          <section>
            <h4>用户评价</h4>
            <div v-for="c in detailModal.data.comments" :key="c.id" style="border-bottom: 1px solid #ddd; padding: 8px 0">
              <div>
                <strong>{{ c.nickname }}</strong>
                <span style="color: #888; margin-left: 8px">{{ c.createdAt }}</span>
              </div>
              <div style="white-space: pre-wrap">{{ c.contentText }}</div>
              <div v-if="c.images?.length">
                <img
                  v-for="(img, i) in c.images"
                  :key="i"
                  :src="assetUrl(img)"
                  alt=""
                  style="max-width: 160px; max-height: 160px; margin: 4px"
                />
              </div>
            </div>
            <p v-if="!detailModal.data.comments?.length">暂无评价</p>
          </section>

          <section style="margin-top: 12px">
            <h4>发送评价（≤2000 字，可 Ctrl+V 粘贴图片；每 5 分钟 1 条）</h4>
            <textarea
              ref="commentInputRef"
              v-model="detailModal.commentText"
              rows="4"
              style="width: 100%"
              maxlength="2000"
              placeholder="写下你的评价，可粘贴图片…"
              @paste="onPasteComment"
            />
            <div>
              字数：{{ [...detailModal.commentText].length }} / 2000
            </div>
            <div v-if="detailModal.commentImages.length">
              <div v-for="(img, i) in detailModal.commentImages" :key="i" style="display: inline-block; margin: 4px">
                <img :src="assetUrl(img)" alt="" width="80" height="80" />
                <button type="button" @click="removeCommentImage(i)">移除</button>
              </div>
            </div>
            <button type="button" @click="sendComment">发送评价</button>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>
