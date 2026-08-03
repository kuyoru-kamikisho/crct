const config = require('./config');
const { getAccessToken, startTokenRefreshLoop } = require('./lib/token');
const { Gateway } = require('./lib/gateway');
const {
  onMessage,
  onInteraction,
  onGroupAddRobot,
  onFriendAdd,
  onGroupMemberAdd,
} = require('./handlers/events');
const { startNickScheduler } = require('./handlers/scheduler');

async function dispatch({ t, d, id }) {
  console.log(`[event] ${t}`);
  try {
    switch (t) {
      case 'GROUP_AT_MESSAGE_CREATE':
      case 'GROUP_MESSAGE_CREATE':
      case 'C2C_MESSAGE_CREATE':
        await onMessage(d, id);
        break;
      case 'INTERACTION_CREATE':
        await onInteraction(d, id);
        break;
      case 'GROUP_ADD_ROBOT':
        await onGroupAddRobot(d, id);
        break;
      case 'FRIEND_ADD':
        await onFriendAdd(d, id);
        break;
      case 'GROUP_MEMBER_ADD':
        await onGroupMemberAdd(d, id);
        break;
      case 'GROUP_DEL_ROBOT':
      case 'FRIEND_DEL':
        console.log(`[event] ${t}`, d);
        break;
      default:
        console.log(`[event] 未处理 ${t}`);
    }
  } catch (err) {
    console.error(`[event] 处理 ${t} 失败`, err.message);
  }
}

async function main() {
  console.log(`QQ Bot Demo 启动 appId=${config.appId}`);
  await getAccessToken();
  startTokenRefreshLoop();
  startNickScheduler();

  const gateway = new Gateway({ onEvent: dispatch });
  await gateway.start();
}

main().catch((err) => {
  console.error('启动失败', err);
  process.exit(1);
});
