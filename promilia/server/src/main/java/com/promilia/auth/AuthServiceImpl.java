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
import com.promilia.mail.MailService;
import com.promilia.user.entity.User;
import com.promilia.user.enums.Gender;
import com.promilia.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final CaptchaService captchaService;
    private final MailService mailService;
    private final UserMapper userMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final PasswordEncoder passwordEncoder;
    private final PromiliaProperties properties;

    @Override
    public void sendRegisterCode(RegisterSendCodeRequest request) {
        captchaService.validateAndConsume(request.getCaptchaId(), request.getCaptchaCode());
        String email = normalizeEmail(request.getEmail());
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
        log.info("注册验证码已发送 email={}", email);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long register(RegisterConfirmRequest request) {
        String email = normalizeEmail(request.getEmail());
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

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname().trim());
        user.setGender(Gender.UNKNOWN);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        user.setDeleted(0);
        userMapper.insert(user);
        log.info("用户注册成功 userId={} email={}", user.getId(), email);
        return user.getId();
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        captchaService.validateAndConsume(request.getCaptchaId(), request.getCaptchaCode());
        String email = normalizeEmail(request.getEmail());
        User user = findByEmail(email);
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.PASSWORD_INVALID);
        }
        String token = CodeGenerator.token();
        long ttl = properties.getAuth().getLoginTokenTtlSeconds();
        stringRedisTemplate.opsForValue().set(
                RedisKeys.loginToken(token),
                String.valueOf(user.getId()),
                ttl,
                TimeUnit.SECONDS
        );
        return new LoginResponse(token, ttl, user.getId(), user.getEmail(), user.getNickname());
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
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        log.info("密码重置成功 email={}", email);
    }

    private void ensureEmailNotRegistered(String email) {
        if (findByEmail(email) != null) {
            throw new BusinessException(ErrorCode.EMAIL_EXISTS);
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
