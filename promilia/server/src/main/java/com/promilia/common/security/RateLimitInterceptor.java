package com.promilia.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.promilia.common.api.ApiResponse;
import com.promilia.common.config.PromiliaProperties;
import com.promilia.common.exception.ErrorCode;
import com.promilia.common.redis.RedisKeys;
import com.promilia.common.util.IpUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private final StringRedisTemplate stringRedisTemplate;
    private final PromiliaProperties properties;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        String ip = IpUtils.resolveClientIp(request);
        String key = RedisKeys.rateLimit(ip, request.getRequestURI());
        Long count = stringRedisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            stringRedisTemplate.expire(key, properties.getRateLimit().getWindowSeconds(), TimeUnit.SECONDS);
        }
        if (count != null && count > properties.getRateLimit().getMaxRequests()) {
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.fail(ErrorCode.TOO_MANY_REQUESTS)));
            return false;
        }
        return true;
    }
}
