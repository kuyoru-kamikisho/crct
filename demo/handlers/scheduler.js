const config = require('../config');
const api = require('../lib/api');
const store = require('../lib/store');

function formatNick() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${config.botNickBase} (${hh}:${mm})`;
}

/**
 * 每分钟尝试更新机器人在各群的昵称。
 * 官方普通群改名片接口可能尚未开放，失败仅打日志。
 */
function startNickScheduler() {
  const run = async () => {
    const nick = formatNick();
    const groups = store.listGroups();
    if (!groups.length) return;

    for (const groupOpenid of groups) {
      try {
        await api.trySetSelfNick(groupOpenid, nick);
        console.log(`[nick] ${groupOpenid} => ${nick}`);
      } catch (err) {
        console.warn(`[nick] 更新失败 ${groupOpenid}:`, err.message);
      }
    }
  };

  run();
  return setInterval(run, config.nickRefreshMs);
}

module.exports = { startNickScheduler, formatNick };
