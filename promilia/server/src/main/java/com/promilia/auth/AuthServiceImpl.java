package com.promilia.auth;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.promilia.auth.dto.ForgotPasswordRequest;
import com.promilia.auth.dto.LoginRequest;
import com.promilia.auth.dto.LoginResponse;
import com.promilia.auth.dto.RegisterConfirmRequest;
import com.promilia.auth.dto.RegisterSendCodeRequest;
import com.promilia.auth.dto.ResetPasswordRequest;
import com.promilia.captcha.CaptchaService;
import com.promilia.common.config.PromiliaProperties;
import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import com.promilia.common.redis.RedisKeys;
import com.promilia.common.util.CodeGenerator;
import com.promilia.common.util.IpLocationResolver;
import com.promilia.common.util.IpUtils;
import com.promilia.common.util.LoginIpStore;
import com.promilia.mail.MailService;
import com.promilia.user.EmailBanService;
import com.promilia.user.entity.EmailBan;
import com.promilia.user.entity.User;
import com.promilia.user.enums.Gender;
import com.promilia.user.enums.UserRole;
import com.promilia.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final int MAX_LOGIN_IPS = 10;

    private final CaptchaService captchaService;
    private final MailService mailService;
    private final UserMapper userMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final PasswordEncoder passwordEncoder;
    private final PasswordCryptoService passwordCryptoService;
    private final EmailBanService emailBanService;
    private final IpLocationResolver ipLocationResolver;
    private final PromiliaProperties properties;

    @Override
    public Map<String, String> sendRegisterCode(RegisterSendCodeRequest request) {
        captchaService.validateAndConsume(request.getCaptchaId(), request.getCaptchaCode());
        String email = normalizeEmail(request.getEmail());
        emailBanService.assertNotBanned(email);
        ensureEmailNotRegistered(email);
        ensureNicknameAvailable(request.getNickname());

        String lockKey = RedisKeys.emailCodeSendLock(email);
        Boolean locked = stringRedisTemplate.opsForValue().setIfAbsent(
                lockKey, "1",
                properties.getAuth().getEmailCodeSendIntervalSeconds(),
                TimeUnit.SECONDS
        );
        if (Boolean.FALSE.equals(locked)) {
            throw new BusinessException(ErrorCode.EMAIL_CODE_SEND_TOO_FAST);
        }

        String code = CodeGenerator.emailCode(6);
        stringRedisTemplate.opsForValue().set(
                RedisKeys.emailCode(email),
                code + "|" + request.getNickname().trim(),
                properties.getAuth().getEmailCodeTtlSeconds(),
                TimeUnit.SECONDS
        );
        mailService.sendVerifyCodeMail(email, code);
        log.info("注册验证码已发送 email={} mock={}", email, properties.getMail().isMock());
        if (properties.getMail().isMock()) {
            return Collections.singletonMap("emailCode", code);
        }
        return null;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long register(RegisterConfirmRequest request) {
        String email = normalizeEmail(request.getEmail());
        emailBanService.assertNotBanned(email);

        String cached = stringRedisTemplate.opsForValue().get(RedisKeys.emailCode(email));
        if (!StringUtils.hasText(cached)) {
            throw new BusinessException(ErrorCode.EMAIL_CODE_INVALID);
        }
        String[] parts = cached.split("\\|", 2);
        String code = parts[0];
        if (!code.equalsIgnoreCase(request.getEmailCode().trim())) {
            throw new BusinessException(ErrorCode.EMAIL_CODE_INVALID);
        }
        stringRedisTemplate.delete(RedisKeys.emailCode(email));

        ensureEmailNotRegistered(email);
        ensureNicknameAvailable(request.getNickname());

        String plainPassword = decryptAndValidatePassword(request.getPassword());

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(plainPassword));
        user.setNickname(request.getNickname().trim());
        user.setGender(Gender.UNKNOWN);
        user.setRole(UserRole.USER);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        user.setDeleted(0);
        userMapper.insert(user);
        log.info("用户注册成功 userId={} email={}", user.getId(), email);
        return user.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        captchaService.validateAndConsume(request.getCaptchaId(), request.getCaptchaCode());
        String plainPassword = passwordCryptoService.decrypt(request.getPassword());
        String email = normalizeEmail(request.getEmail());

        EmailBan ban = emailBanService.findActiveBan(email);
        if (ban != null) {
            String tip = StringUtils.hasText(ban.getReason())
                    ? "账号已被禁用，原因：" + ban.getReason()
                    : ErrorCode.ACCOUNT_DISABLED.getMessage();
            throw new BusinessException(ErrorCode.ACCOUNT_DISABLED, tip);
        }

        User user = findByEmail(email);
        if (user == null || !passwordEncoder.matches(plainPassword, user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.PASSWORD_INVALID);
        }

        String clientIp = IpUtils.resolveClientIp(httpRequest);
        String loginIpsJson = LoginIpStore.push(user.getLoginIps(), clientIp, MAX_LOGIN_IPS);
        String location = ipLocationResolver.resolve(clientIp);
        user.setLoginIps(loginIpsJson);
        user.setIpLocation(location);
        // 若用户表上曾有过期禁用冗余字段，登录成功时清掉
        user.setBanUntil(null);
        user.setBanReason(null);
        user.setUpdatedAt(LocalDateTime.now());
        if (user.getRole() == null) {
            user.setRole(UserRole.USER);
        }
        userMapper.updateById(user);

        String token = CodeGenerator.token();
        long ttl = properties.getAuth().getLoginTokenTtlSeconds();
        stringRedisTemplate.opsForValue().set(
                RedisKeys.loginToken(token),
                String.valueOf(user.getId()),
                ttl,
                TimeUnit.SECONDS
        );
        List<String> ips = LoginIpStore.parse(loginIpsJson);
        return LoginResponse.builder()
                .token(token)
                .expireInSeconds(ttl)
                .userId(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .role(user.getRole())
                .ipLocation(location)
                .loginIps(ips)
                .build();
    }

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        captchaService.validateAndConsume(request.getCaptchaId(), request.getCaptchaCode());
        String email = normalizeEmail(request.getEmail());
        User user = findByEmail(email);
        if (user == null) {
            throw new BusinessException(ErrorCode.EMAIL_NOT_FOUND);
        }
        String resetToken = CodeGenerator.token();
        stringRedisTemplate.opsForValue().set(
                RedisKeys.resetToken(resetToken),
                email,
                properties.getAuth().getResetTokenTtlSeconds(),
                TimeUnit.SECONDS
        );
        String link = properties.getResetPassword().getLinkBaseUrl() + "?token=" + resetToken;
        mailService.sendResetPasswordMail(email, link);
        log.info("重置密码邮件已发送 email={}", email);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void resetPassword(ResetPasswordRequest request) {
        captchaService.validateAndConsume(request.getCaptchaId(), request.getCaptchaCode());
        String key = RedisKeys.resetToken(request.getResetToken());
        String email = stringRedisTemplate.opsForValue().get(key);
        if (!StringUtils.hasText(email)) {
            throw new BusinessException(ErrorCode.RESET_TOKEN_INVALID);
        }
        stringRedisTemplate.delete(key);

        User user = findByEmail(email);
        if (user == null) {
            throw new BusinessException(ErrorCode.EMAIL_NOT_FOUND);
        }
        String plainPassword = decryptAndValidatePassword(request.getNewPassword());
        user.setPasswordHash(passwordEncoder.encode(plainPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        log.info("密码重置成功 email={}", email);
    }

    private String decryptAndValidatePassword(String cipherBase64) {
        String plain = passwordCryptoService.decrypt(cipherBase64);
        if (plain.length() < 6 || plain.length() > 64) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "密码长度需在 6~64 之间");
        }
        return plain;
    }

    private void ensureEmailNotRegistered(String email) {
        if (findByEmail(email) != null) {
            throw new BusinessException(ErrorCode.EMAIL_EXISTS, "该邮箱已注册，请直接登录或找回密码");
        }
    }

    private void ensureNicknameAvailable(String nickname) {
        Long count = userMapper.selectCount(new LambdaQueryWrapper<User>()
                .eq(User::getNickname, nickname.trim()));
        if (count != null && count > 0) {
            throw new BusinessException(ErrorCode.NICKNAME_EXISTS);
        }
    }

    private User findByEmail(String email) {
        return userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getEmail, email));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}
