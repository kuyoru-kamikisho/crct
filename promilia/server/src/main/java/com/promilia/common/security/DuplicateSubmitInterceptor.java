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
public class DuplicateSubmitInterceptor implements HandlerInterceptor {

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    private final PromiliaProperties properties;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String method = request.getMethod();
        if (!HttpMethod.POST.matches(method)
                && !HttpMethod.PUT.matches(method)
                && !HttpMethod.PATCH.matches(method)) {
            return true;
        }
        long ttl = properties.getRateLimit().getDuplicateSubmitSeconds();
        if (ttl <= 0) {
            return true;
        }
        String token = request.getHeader("Authorization");
        String identity = (token != null && token.length() > 0) ? token : IpUtils.resolveClientIp(request);
        String key = RedisKeys.duplicateSubmit(identity, request.getRequestURI());
        Boolean success = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", ttl, TimeUnit.SECONDS);
        if (Boolean.FALSE.equals(success)) {
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.fail(ErrorCode.DUPLICATE_SUBMIT)));
            return false;
        }
        return true;
    }
}
