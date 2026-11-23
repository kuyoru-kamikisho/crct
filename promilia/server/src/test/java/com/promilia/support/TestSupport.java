package com.promilia.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.promilia.common.redis.RedisKeys;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.web.servlet.MvcResult;

public final class TestSupport {

    private TestSupport() {
    }

    public static JsonNode json(ObjectMapper objectMapper, MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    public static String captchaCode(StringRedisTemplate redis, String captchaId) {
        return redis.opsForValue().get(RedisKeys.captcha(captchaId));
    }

    public static String emailCode(StringRedisTemplate redis, String email) {
        String cached = redis.opsForValue().get(RedisKeys.emailCode(email.toLowerCase()));
        if (cached == null) {
            return null;
        }
        int idx = cached.indexOf('|');
        return idx > 0 ? cached.substring(0, idx) : cached;
    }

    public static String resetTokenByEmail(StringRedisTemplate redis, String email) {
        // 测试中通过 forgot 后从 Redis keys 扫描不优雅；改为 Auth 测试里拦截邮件内容或直接写入。
        // 这里提供按前缀扫描（仅测试环境数据量小）。
        for (String key : redis.keys(RedisKeys.resetToken("*"))) {
            String value = redis.opsForValue().get(key);
            if (email.equalsIgnoreCase(value)) {
                return key.substring("auth:reset:".length());
            }
        }
        return null;
    }
}
