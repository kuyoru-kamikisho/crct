/**
 * 进程内状态：最近消息、答题、违规计数、已加入的群
 */
const lastBotMessage = new Map(); // sceneKey -> { id, ts }
const quizMessages = new Map(); // quizMsgId -> { groupOpenid, correct }
const violations = new Map(); // `${group}:${member}` -> count
const joinedGroups = new Set();

function sceneKey(scene, id) {
  return `${scene}:${id}`;
}

function rememberBotMessage(scene, targetId, messageId) {
  if (!messageId) return;
  lastBotMessage.set(sceneKey(scene, targetId), {
    id: messageId,
    ts: Date.now(),
  });
}

function getLastBotMessage(scene, targetId) {
  return lastBotMessage.get(sceneKey(scene, targetId));
}

function registerQuiz(messageId, groupOpenid) {
  quizMessages.set(messageId, { groupOpenid, correct: '2' });
}

function getQuiz(messageId) {
  return quizMessages.get(messageId);
}

function bumpViolation(groupOpenid, memberOpenid) {
  const key = `${groupOpenid}:${memberOpenid}`;
  const n = (violations.get(key) || 0) + 1;
  violations.set(key, n);
  return n;
}

function resetViolation(groupOpenid, memberOpenid) {
  violations.delete(`${groupOpenid}:${memberOpenid}`);
}

function trackGroup(groupOpenid) {
  if (groupOpenid) joinedGroups.add(groupOpenid);
}

function listGroups() {
  return [...joinedGroups];
}

module.exports = {
  rememberBotMessage,
  getLastBotMessage,
  registerQuiz,
  getQuiz,
  bumpViolation,
  resetViolation,
  trackGroup,
  listGroups,
};
