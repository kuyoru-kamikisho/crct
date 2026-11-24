package com.promilia.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "promilia")
public class PromiliaProperties {

    private Mail mail = new Mail();
    private Auth auth = new Auth();
    private RateLimit rateLimit = new RateLimit();
    private Upload upload = new Upload();
    private ResetPassword resetPassword = new ResetPassword();

    @Data
    public static class Mail {
        /**
         * 本地开发：不连真实 SMTP，只打日志（验证码可在日志/接口响应中看到）。
         * 上线前务必改为 false 并配置真实邮箱。
         */
        private boolean mock = false;
        private String from = "noreply@example.com";
        private int retryTimes = 3;
        private long retryIntervalMs = 500;
        private Imap imap = new Imap();
    }

    @Data
    public static class Imap {
        private String host = "imap.example.com";
        private int port = 993;
        private String username;
        private String password;
        private boolean ssl = true;
    }

    @Data
    public static class Auth {
        private long emailCodeTtlSeconds = 300;
        private long emailCodeSendIntervalSeconds = 60;
        private long resetTokenTtlSeconds = 900;
        private long loginTokenTtlSeconds = 86400;
        private long captchaTtlSeconds = 300;
    }

    @Data
    public static class RateLimit {
        private long windowSeconds = 60;
        private int maxRequests = 30;
        private long duplicateSubmitSeconds = 2;
    }

    @Data
    public static class Upload {
        private String avatarDir = "./uploads/avatars";
    }

    @Data
    public static class ResetPassword {
        private String linkBaseUrl = "http://localhost:8080/api/auth/reset-password";
    }
}
