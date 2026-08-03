const config = require('../config');
const { getAccessToken } = require('./token');

const FILE_TYPE = { image: 1, video: 2, voice: 3, file: 4 };

async function request(method, path, body) {
  const token = await getAccessToken();
  const res = await fetch(`${config.apiBase}${path}`, {
    method,
    headers: {
      Authorization: `QQBot ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'X-Union-Appid': config.appId,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const err = new Error(
      `API ${method} ${path} => ${res.status} ${JSON.stringify(data)}`,
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function getGatewayUrl() {
  const data = await request('GET', '/gateway');
  return data.url;
}

/** 群消息序号，同一 msg_id 多次回复需递增 */
const msgSeqMap = new Map();
function nextMsgSeq(msgId) {
  if (!msgId) return 1;
  const n = (msgSeqMap.get(msgId) || 0) + 1;
  msgSeqMap.set(msgId, n);
  return n;
}

function atMember(memberOpenid) {
  return `<@!${memberOpenid}>`;
}

async function sendGroupMessage(groupOpenid, payload) {
  const body = { ...payload };
  if (body.msg_id) {
    body.msg_seq = body.msg_seq || nextMsgSeq(body.msg_id);
  }
  return request('POST', `/v2/groups/${groupOpenid}/messages`, body);
}

async function sendC2CMessage(userOpenid, payload) {
  const body = { ...payload };
  if (body.msg_id) {
    body.msg_seq = body.msg_seq || nextMsgSeq(body.msg_id);
  }
  return request('POST', `/v2/users/${userOpenid}/messages`, body);
}

async function recallGroupMessage(groupOpenid, messageId) {
  return request('DELETE', `/v2/groups/${groupOpenid}/messages/${messageId}`);
}

async function recallC2CMessage(userOpenid, messageId) {
  return request('DELETE', `/v2/users/${userOpenid}/messages/${messageId}`);
}

async function uploadGroupFile(groupOpenid, { fileType, url, fileData }) {
  const body = {
    file_type: fileType,
    srv_send_msg: false,
  };
  if (url) body.url = url;
  if (fileData) body.file_data = fileData;
  return request('POST', `/v2/groups/${groupOpenid}/files`, body);
}

async function uploadC2CFile(userOpenid, { fileType, url, fileData }) {
  const body = {
    file_type: fileType,
    srv_send_msg: false,
  };
  if (url) body.url = url;
  if (fileData) body.file_data = fileData;
  return request('POST', `/v2/users/${userOpenid}/files`, body);
}

async function sendGroupMedia(groupOpenid, { fileType, url, msgId, content }) {
  const uploaded = await uploadGroupFile(groupOpenid, { fileType, url });
  return sendGroupMessage(groupOpenid, {
    msg_type: 7,
    content: content || '',
    media: { file_info: uploaded.file_info },
    msg_id: msgId,
  });
}

async function sendC2CMedia(userOpenid, { fileType, url, msgId, content }) {
  const uploaded = await uploadC2CFile(userOpenid, { fileType, url });
  return sendC2CMessage(userOpenid, {
    msg_type: 7,
    content: content || '',
    media: { file_info: uploaded.file_info },
    msg_id: msgId,
  });
}

/**
 * 官方群管理文档目前几乎为空。
 * 以下接口按社区约定尝试调用，失败时上层应捕获并降级。
 */
async function tryMuteGroupMember(groupOpenid, memberOpenid, seconds) {
  return request(
    'POST',
    `/v2/groups/${groupOpenid}/members/${memberOpenid}/mute`,
    { mute_seconds: String(seconds) },
  );
}

async function trySetMemberNick(groupOpenid, memberOpenid, nick) {
  return request(
    'PATCH',
    `/v2/groups/${groupOpenid}/members/${memberOpenid}`,
    { nick },
  );
}

async function trySetSelfNick(groupOpenid, nick) {
  return request('PATCH', `/v2/groups/${groupOpenid}/members/@me`, { nick });
}

module.exports = {
  FILE_TYPE,
  request,
  getGatewayUrl,
  atMember,
  sendGroupMessage,
  sendC2CMessage,
  recallGroupMessage,
  recallC2CMessage,
  uploadGroupFile,
  uploadC2CFile,
  sendGroupMedia,
  sendC2CMedia,
  tryMuteGroupMember,
  trySetMemberNick,
  trySetSelfNick,
  nextMsgSeq,
};
