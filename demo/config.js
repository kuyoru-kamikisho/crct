/**
 * 机器人配置
 * 优先读取环境变量，便于本地覆盖敏感信息
 */
module.exports = {
  appId: process.env.QQBOT_APP_ID || '1905345176',
  clientSecret: process.env.QQBOT_CLIENT_SECRET || 'gLsFQQBftsiKhpiL',

  /** OpenAPI 基址 */
  apiBase: process.env.QQBOT_API_BASE || 'https://api.sgroup.qq.com',
  /** 获取 AccessToken */
  tokenUrl: 'https://bots.qq.com/app/getAppAccessToken',

  /**
   * Intent 位：
   */
  intents: (1 << 12) | (1 << 25) | (1 << 26) | (1 << 29),

  botNickBase: '木灵朵',
  nickRefreshMs: 60 * 1000,

  /** 演示用公网资源（可换成自己的 CDN） */
  demoImageUrl:
    process.env.DEMO_IMAGE_URL ||
    'https://qqminiapp.cdn-go.cn/qq-open-platform/9b9327f1/assets/33-2-GiI9drV8.png',
  /** 语音须为 silk；若无可用地址，相关指令会提示 */
  demoVoiceUrl: process.env.DEMO_VOICE_URL || '',

  /** 违规关键词（演示） */
  violationWords: ['你们是狗'],
  violationMuteThreshold: 3,
  muteSeconds: 3600,

  quizQuestion: '1+1等于几？',
  quizAnswer: '2',
};
