package com.promilia.common.config;

import com.promilia.common.security.AdminInterceptor;
import com.promilia.common.security.AuthInterceptor;
import com.promilia.common.security.DuplicateSubmitInterceptor;
import com.promilia.common.security.RateLimitInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final AdminInterceptor adminInterceptor;
    private final RateLimitInterceptor rateLimitInterceptor;
    private final DuplicateSubmitInterceptor duplicateSubmitInterceptor;
    private final PromiliaProperties properties;

    // 跨域统一由 CorsConfig#corsFilter 全局处理，避免拦截器短路时丢 CORS 头

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/**");
        registry.addInterceptor(duplicateSubmitInterceptor)
                .addPathPatterns("/api/**");
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/user/**", "/api/characters/**");
        registry.addInterceptor(adminInterceptor)
                .addPathPatterns("/api/admin/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        addDir(registry, "/avatars/**", properties.getUpload().getAvatarDir());
        addDir(registry, "/characters/**", properties.getUpload().getCharacterImageDir());
        addDir(registry, "/comment-images/**", properties.getUpload().getCommentImageDir());
    }

    private void addDir(ResourceHandlerRegistry registry, String pattern, String dir) {
        String location = "file:" + dir.replace("\\", "/");
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler(pattern).addResourceLocations(location);
    }
}
