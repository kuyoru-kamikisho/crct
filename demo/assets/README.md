# 资源目录

可将演示图片、silk 语音放在此处，再通过自建 CDN / 对象存储提供公网 URL，并配置：

- `DEMO_IMAGE_URL`
- `DEMO_VOICE_URL`

官方上传接口也支持 `file_data`（本地文件 base64），可在 `lib/api.js` 的上传函数中扩展。
