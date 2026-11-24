package com.promilia.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.promilia.common.api.ApiResponse;
import com.promilia.common.exception.ErrorCode;
import com.promilia.common.redis.RedisKeys;
import com.promilia.user.entity.User;
import com.promilia.user.enums.UserRole;
import com.promilia.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * 校验登录且角色为管理员。须挂在 AuthInterceptor 之后，或自行完成鉴权。
 * 本拦截器独立完成 Bearer 鉴权 + 管理员校验，便于只保护 /api/admin/**。
 */
@Component
@RequiredArgsConstructor
public class AdminInterceptor implements HandlerInterceptor {

    private final StringRedisTemplate stringRedisTemplate;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        String token = request.getHeader("Authorization");
        if (StringUtils.hasText(token) && token.startsWith("Bearer ")) {
            token = token.substring(7).trim();
        }
        if (!StringUtils.hasText(token)) {
            write(response, ErrorCode.UNAUTHORIZED);
            return false;
        }
        String userId = stringRedisTemplate.opsForValue().get(RedisKeys.loginToken(token));
        if (!StringUtils.hasText(userId)) {
            write(response, ErrorCode.UNAUTHORIZED);
            return false;
        }
        Long id = Long.valueOf(userId);
        User user = userMapper.selectById(id);
        if (user == null || user.getRole() != UserRole.ADMIN) {
            write(response, ErrorCode.FORBIDDEN);
            return false;
        }
        UserContext.setUserId(id);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }

    private void write(HttpServletResponse response, ErrorCode errorCode) throws Exception {
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.fail(errorCode)));
    }
}
