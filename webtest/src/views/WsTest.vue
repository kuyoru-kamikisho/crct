<template>
  <div class="ws-test">
    <button @click="connectAction">
      {{ nowStatusIndex }}:{{ status }}
    </button>

    <textarea :value="wsMessage"></textarea>
  </div>
</template>

<script>
const STATUS_ENUMS = {
  0: '未连接',
  1: '正在连接',
  2: '连接失败',
  3: '已连接',
  4: '正在断开连接',
  5: '已断开',
  6: '遇到错误',
}

let wsInstance
export default {
  name: "WsTest",
  data: () => ({
    status: '未连接',
    wsMessage: '',
  }),
  computed: {
    nowStatusIndex() {
      const enums = []
      for (let key in STATUS_ENUMS) {
        enums.push(STATUS_ENUMS[key])
      }
      return enums.findIndex(str => str === this.status)
    }
  },
  methods: {
    connectAction() {
      if ([1, 3, 4].includes(this.nowStatusIndex)) return

      this.status = STATUS_ENUMS[1]
      wsInstance = new WebSocket('ws://192.168.110.50:7077')
      wsInstance.onopen = e => {
        this.status = STATUS_ENUMS[3]
        wsInstance.send('hello')
      }
      wsInstance.onmessage = e => {
        console.log('收到消息:', e.data)
        this.wsMessage += e.data + '\n'
      }
      wsInstance.onclose = e => {
        this.status = STATUS_ENUMS[5]
        setTimeout(() => {
          this.status = STATUS_ENUMS[0]
        }, 1000)
      }
      wsInstance.onerror = e => {
        this.status = STATUS_ENUMS[6]
      }
    }
  },
  mounted() {
  }
}
</script>

<style scoped lang="scss">
.ws-test {
  button {
    padding: 5px 20px;
  }

  textarea {
    display: block;
    width: 60%;
    margin-top: 12px;
    height: 200px;
  }
}
</style>