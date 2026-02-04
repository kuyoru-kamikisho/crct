<template>
  <div class="ws-test">
    <button @click="connectAction">
      {{ nowStatusIndex }}:{{ status }}
    </button>
    <input v-model="myMessage" @keyup.enter.prevent="sendMyMsg" type="text" placeholder="输入要发送的内容">
    <button @click="clearWsMsg" class="clear-btn">清空</button>
    <textarea v-model="wsMessage"></textarea>
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

let wsInstance = null
export default {
  name: "WsTest",
  data: () => ({
    status: '未连接',
    wsMessage: '',
    myMessage: '',
  }),
  computed: {
    wsActivating() {
      return [1, 3, 4].includes(this.nowStatusIndex)
    },
    nowStatusIndex() {
      const enums = []
      for (let key in STATUS_ENUMS) {
        enums.push(STATUS_ENUMS[key])
      }
      return enums.findIndex(str => str === this.status)
    }
  },
  methods: {
    clearWsMsg() {
      this.wsMessage = ''
    },
    sendMyMsg() {
      if (!this.myMessage) return;
      if (this.wsActivating) {
        wsInstance.send(this.myMessage)
        this.wsMessage += `[已发送] ${this.myMessage}\n`
        this.myMessage = ''
      } else {
        this.wsMessage += `[未发送] ${this.myMessage}，ws服务端未连接\n`
      }
    },
    connectAction() {
      if (this.wsActivating) return

      const textareaDom = document.querySelector('textarea')

      this.status = STATUS_ENUMS[1]
      wsInstance = new WebSocket('ws://127.0.0.1:7077')
      wsInstance.onopen = e => {
        this.status = STATUS_ENUMS[3]
        wsInstance.send('hello')
      }
      wsInstance.onmessage = e => {
        console.log('收到消息:', e.data)
        this.wsMessage += e.data + '\n'
        requestAnimationFrame(() => {
          textareaDom.scrollTo({
            top: textareaDom.scrollHeight,
            behavior: 'smooth'
          })
        })
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

  input {
    display: inline-block;
    margin-left: 20px;
    font-size: 16px;
    outline: none;
    padding: 5px 6px;
  }

  .clear-btn {
    margin-left: 20px;
  }
}
</style>