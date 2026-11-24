package com.promilia.common.config;

import com.promilia.common.security.AdminInterceptor;
import com.promilia.common.security.AuthInterceptor;
import com.promilia.common.security.DuplicateSubmitInterceptor;
import com.promilia.common.security.RateLimitInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
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

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:8089")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/**");
        registry.addInterceptor(duplicateSubmitInterceptor)
                .addPathPatterns("/api/**");
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/user/**");
        registry.addInterceptor(adminInterceptor)
                .addPathPatterns("/api/admin/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + properties.getUpload().getAvatarDir().replace("\\", "/");
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/avatars/**")
                .addResourceLocations(location);
    }
}
