const config = require('../config');

let cache = { token: '', expiresAt: 0 };

/**
 * 获取并缓存 AccessToken，到期前 60 秒自动刷新
 */
async function getAccessToken() {
  const now = Date.now();
  if (cache.token && now < cache.expiresAt - 60_000) {
    return cache.token;
  }

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: config.appId,
      clientSecret: config.clientSecret,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`获取 access_token 失败: ${JSON.stringify(data)}`);
  }

  const expiresIn = Number(data.expires_in || 7200);
  cache = {
    token: data.access_token,
    expiresAt: now + expiresIn * 1000,
  };
  console.log(`[token] 已刷新，有效期 ${expiresIn}s`);
  return cache.token;
}

function startTokenRefreshLoop() {
  // 启动时由 main 先拉取一次；此处仅定时续期
  setInterval(async () => {
    try {
      await getAccessToken();
    } catch (err) {
      console.error('[token] 刷新失败', err.message);
    }
  }, 30 * 60 * 1000);
}

module.exports = { getAccessToken, startTokenRefreshLoop };
