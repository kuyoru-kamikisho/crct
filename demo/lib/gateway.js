const WebSocket = require('ws');
const { getAccessToken } = require('./token');
const { getGatewayUrl } = require('./api');
const config = require('../config');

const OP = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
};

/**
 * WebSocket 网关客户端：鉴权、心跳、断线重连
 */
class Gateway {
  constructor({ onEvent }) {
    this.onEvent = onEvent;
    this.ws = null;
    this.sessionId = null;
    this.lastSeq = null;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.alive = false;
  }

  async start() {
    const url = await getGatewayUrl();
    console.log('[gateway] 连接', url);
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.alive = true;
      console.log('[gateway] 已连接');
    });

    this.ws.on('message', (buf) => this.handleMessage(buf.toString()));

    this.ws.on('close', (code, reason) => {
      this.alive = false;
      this.stopHeartbeat();
      console.warn(`[gateway] 断开 code=${code} reason=${reason}`);
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[gateway] 错误', err.message);
    });
  }

  async handleMessage(raw) {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    const { op, d, s, t, id } = payload;
    if (s != null) this.lastSeq = s;

    switch (op) {
      case OP.HELLO:
        this.startHeartbeat(d.heartbeat_interval);
        if (this.sessionId) {
          await this.resume();
        } else {
          await this.identify();
        }
        break;
      case OP.DISPATCH:
        if (t === 'READY') {
          this.sessionId = d.session_id;
          console.log('[gateway] READY', d.user?.username || '');
        } else if (t === 'RESUMED') {
          console.log('[gateway] RESUMED');
        } else if (t) {
          await this.onEvent({ t, d, id, s });
        }
        break;
      case OP.HEARTBEAT_ACK:
        break;
      case OP.RECONNECT:
        this.ws.close();
        break;
      case OP.INVALID_SESSION:
        this.sessionId = null;
        this.ws.close();
        break;
      default:
        break;
    }
  }

  async identify() {
    const token = await getAccessToken();
    this.send({
      op: OP.IDENTIFY,
      d: {
        token: `QQBot ${token}`,
        intents: config.intents,
        shard: [0, 1],
        properties: {
          $os: process.platform,
          $browser: 'qqbot-ly-demo',
          $device: 'qqbot-ly-demo',
        },
      },
    });
  }

  async resume() {
    const token = await getAccessToken();
    this.send({
      op: OP.RESUME,
      d: {
        token: `QQBot ${token}`,
        session_id: this.sessionId,
        seq: this.lastSeq,
      },
    });
  }

  startHeartbeat(interval) {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ op: OP.HEARTBEAT, d: this.lastSeq });
    }, interval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.start().catch((err) => {
        console.error('[gateway] 重连失败', err.message);
        this.scheduleReconnect();
      });
    }, 3000);
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }
}

module.exports = { Gateway };
