package com.wiki.service.impl;

import com.wiki.entity.User;
import com.wiki.repository.UserRepository;
import com.wiki.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Service
public class UserServiceImpl implements UserService {
    private static final int MAX_FAILED_LOGIN_COUNT = 5;
    private static final long LOCK_MINUTES = 24 * 60;
    private static final long REGISTER_LIMIT_SECONDS = 10;
    private static final long LOGIN_LIMIT_SECONDS = 60;
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");
    private static final Pattern RECOVERY_KEY_PATTERN = Pattern.compile("^[\\p{Graph}]{20,40}$");
    private static final Pattern IPV4_PATTERN = Pattern.compile("^(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)$");
    private static final Pattern IPV6_PATTERN = Pattern.compile("^[0-9a-fA-F:]+$");

    @Autowired
    private UserRepository userRepository;

    @Override
    public List<User> findAll() {
        return userRepository.findAll();
    }

    @Override
    public User findById(Integer id) {
        return userRepository.findById(id).orElse(null);
    }

    @Override
    public User findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Override
    public User findByUserIdForRetrieve(Integer userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findByIdAndDeletedAtIsNull(userId);
    }

    @Override
    public User findActiveByUsername(String username) {
        return userRepository.findByUsernameAndDeletedAtIsNull(username);
    }

    @Override
    public User save(User user) {
        validateUserType(user.getUserType());
        validateGender(user.getGender());
        normalizeUser(user);
        return userRepository.save(user);
    }

    @Override
    public User recordLoginSuccess(String username) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username);
        if (user == null) {
            return null;
        }
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        user.setLastLoginTime(new Date());
        return userRepository.save(user);
    }

    @Override
    public User recordLoginFailure(String username) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username);
        if (user == null) {
            return null;
        }

        int failedCount = user.getFailedLoginCount() == null ? 0 : user.getFailedLoginCount();
        failedCount++;
        user.setFailedLoginCount(failedCount);

        if (failedCount >= MAX_FAILED_LOGIN_COUNT) {
            user.setLockedUntil(new Date(System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(LOCK_MINUTES)));
        }
        return userRepository.save(user);
    }

    @Override
    public boolean canAccess(String username) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username);
        return user != null && getAccessBlockReason(user) == null;
    }

    @Override
    public String getAccessBlockReason(User user) {
        if (user == null) {
            return "USER_NOT_FOUND_OR_DELETED";
        }
        if (user.getDeletedAt() != null) {
            return "USER_DELETED";
        }
        if (Boolean.TRUE.equals(user.getMarked())) {
            return "USER_MARKED_IN_PENALTY";
        }
        if (user.getLockedUntil() != null && user.getLockedUntil().after(new Date())) {
            return "ACCOUNT_LOCKED";
        }
        return null;
    }

    @Override
    public void deleteById(Integer id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return;
        }
        user.setDeletedAt(new Date());
        user.setUserType((byte) 3);
        userRepository.save(user);
    }

    @Override
    public boolean isUsernameAvailable(String username) {
        if (username == null || username.trim().isEmpty()) {
            return false;
        }
        return userRepository.findByUsername(username.trim()) == null;
    }

    @Override
    public Map<String, Object> register(String username, String password, String recoveryKey, String ipAddress, String birthday, Byte gender) {
        if (username == null || username.trim().isEmpty()) {
            return fail(400, "用户名不能为空");
        }
        String cleanUsername = username.trim();
        if (!isUsernameAvailable(cleanUsername)) {
            return fail(400, "用户名已存在");
        }
        if (!isValidPassword(password)) {
            return fail(400, "密码格式不合法");
        }
        if (!isValidRecoveryKey(recoveryKey)) {
            return fail(400, "恢复密钥格式不合法");
        }
        if (!isValidIp(ipAddress)) {
            return fail(400, "IP格式不合法");
        }

        User user = new User();
        user.setUsername(cleanUsername);
        user.setPasswordHash(hashValue(password));
        user.setRecoveryKey(hashValue(recoveryKey));
        user.setIpAddress(ipAddress.trim());
        user.setBirthday(parseBirthdayOrToday(birthday));
        user.setGender(gender == null ? (byte) 2 : gender);
        user.setDeletedAt(null);
        user.setUserType((byte) 2);
        User saved = save(user);

        Map<String, Object> payload = new HashMap<String, Object>();
        payload.put("user", safeUser(saved));
        return ok("注册成功", payload);
    }

    @Override
    public Map<String, Object> login(String username, String password, String ipAddress) {
        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            return fail(400, "用户名或密码不能为空");
        }
        if (!isValidIp(ipAddress)) {
            return fail(400, "IP格式不合法");
        }

        User anyUser = userRepository.findByUsername(username.trim());
        if (anyUser != null && anyUser.getDeletedAt() != null) {
            return fail(403, "已被注销的用户名");
        }

        User user = userRepository.findByUsernameAndDeletedAtIsNull(username.trim());
        if (user == null) {
            return fail(404, "用户不存在");
        }

        if (user.getLastLoginTime() != null && System.currentTimeMillis() - user.getLastLoginTime().getTime() < TimeUnit.SECONDS.toMillis(LOGIN_LIMIT_SECONDS)) {
            return fail(403, "60秒后可再次登录");
        }

        if (user.getLockedUntil() != null && user.getLockedUntil().after(new Date())) {
            return fail(403, "该账户已被锁定，24小时后可重试");
        }

        if (!hashValue(password).equals(user.getPasswordHash())) {
            User updated = recordLoginFailure(user.getUsername());
            int failed = updated != null && updated.getFailedLoginCount() != null ? updated.getFailedLoginCount() : 1;
            if (failed >= MAX_FAILED_LOGIN_COUNT) {
                return fail(403, "该账户已被锁定，24小时后可重试");
            }
            return fail(400, "用户名或密码错误，剩余可试次数：" + (MAX_FAILED_LOGIN_COUNT - failed));
        }

        user.setIpAddress(ipAddress.trim());
        User success = recordLoginSuccess(user.getUsername());
        success.setIpAddress(ipAddress.trim());
        success = userRepository.save(success);

        Map<String, Object> payload = new HashMap<String, Object>();
        payload.put("token", createToken(success));
        payload.put("user", safeUser(success));
        return ok("登录成功", payload);
    }

    @Override
    public Map<String, Object> resetPassword(String username, Integer userId, String recoveryKey, String newPassword, String newRecoveryKey) {
        if (!isValidPassword(newPassword)) {
            return fail(400, "新密码格式不合法");
        }
        if (!isValidRecoveryKey(newRecoveryKey)) {
            return fail(400, "新恢复密钥格式不合法");
        }
        if (recoveryKey == null || recoveryKey.trim().isEmpty()) {
            return fail(400, "恢复密钥不能为空");
        }

        String hashedRecovery = hashValue(recoveryKey);
        User user = null;
        if (username != null && !username.trim().isEmpty()) {
            user = userRepository.findByUsernameAndRecoveryKeyAndDeletedAtIsNull(username.trim(), hashedRecovery);
        } else if (userId != null) {
            user = userRepository.findByIdAndRecoveryKeyAndDeletedAtIsNull(userId, hashedRecovery);
        }
        if (user == null) {
            return fail(400, "用户名/ID或恢复密钥错误");
        }

        user.setPasswordHash(hashValue(newPassword));
        user.setRecoveryKey(hashValue(newRecoveryKey));
        user.setPasswordUpdatedAt(new Date());
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        return ok("重置密码成功", null);
    }

    private void normalizeUser(User user) {
        Date now = new Date();
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(now);
        }
        if (user.getMarked() == null) {
            user.setMarked(false);
        }
        if (user.getFailedLoginCount() == null) {
            user.setFailedLoginCount(0);
        }
        if (user.getUserType() == null) {
            user.setUserType((byte) 2);
        }
        if (user.getGender() == null) {
            user.setGender((byte) 2);
        }
        if (user.getBirthday() == null) {
            user.setBirthday(now);
        }

        if (!Boolean.TRUE.equals(user.getMarked())) {
            user.setMarkTime(null);
            user.setMarkReason(null);
        } else if (user.getMarkTime() == null) {
            user.setMarkTime(now);
        }

        User existing = user.getId() == null ? null : userRepository.findById(user.getId()).orElse(null);
        if (existing != null) {
            if (isPasswordChanged(existing, user)) {
                user.setPasswordUpdatedAt(now);
            } else if (user.getPasswordUpdatedAt() == null) {
                user.setPasswordUpdatedAt(existing.getPasswordUpdatedAt());
            }
        } else if (user.getPasswordUpdatedAt() == null) {
            user.setPasswordUpdatedAt(now);
        }
    }

    private boolean isPasswordChanged(User existing, User incoming) {
        if (incoming.getPasswordHash() == null) {
            return false;
        }
        return existing.getPasswordHash() == null || !existing.getPasswordHash().equals(incoming.getPasswordHash());
    }

    private void validateUserType(Byte userType) {
        if (userType == null) {
            return;
        }
        if (userType < 0 || userType > 3) {
            throw new IllegalArgumentException("user_type must be in range [0, 3].");
        }
    }

    private void validateGender(Byte gender) {
        if (gender == null) {
            return;
        }
        if (gender < 0 || gender > 3) {
            throw new IllegalArgumentException("gender must be in range [0, 3].");
        }
    }

    private boolean isValidPassword(String password) {
        return password != null && PASSWORD_PATTERN.matcher(password).matches();
    }

    private boolean isValidRecoveryKey(String recoveryKey) {
        return recoveryKey != null && RECOVERY_KEY_PATTERN.matcher(recoveryKey).matches();
    }

    private boolean isValidIp(String ipAddress) {
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            return false;
        }
        String input = ipAddress.trim();
        return IPV4_PATTERN.matcher(input).matches() || IPV6_PATTERN.matcher(input).matches();
    }

    private Date parseBirthdayOrToday(String birthday) {
        if (birthday == null || birthday.trim().isEmpty()) {
            return new Date();
        }
        try {
            return new SimpleDateFormat("yyyy-MM-dd").parse(birthday.trim());
        } catch (ParseException ex) {
            return new Date();
        }
    }

    private Map<String, Object> safeUser(User user) {
        Map<String, Object> safe = new HashMap<String, Object>();
        safe.put("id", user.getId());
        safe.put("username", user.getUsername());
        safe.put("ipAddress", user.getIpAddress());
        safe.put("userType", user.getUserType());
        safe.put("createdAt", user.getCreatedAt());
        safe.put("deletedAt", user.getDeletedAt());
        safe.put("birthday", user.getBirthday());
        safe.put("bio", user.getBio());
        safe.put("gender", user.getGender());
        safe.put("lastLoginTime", user.getLastLoginTime());
        safe.put("position", user.getPosition());
        safe.put("marked", user.getMarked());
        safe.put("markTime", user.getMarkTime());
        safe.put("markReason", user.getMarkReason());
        safe.put("passwordUpdatedAt", user.getPasswordUpdatedAt());
        safe.put("failedLoginCount", user.getFailedLoginCount());
        safe.put("lockedUntil", user.getLockedUntil());
        return safe;
    }

    private String createToken(User user) {
        String raw = user.getId() + ":" + user.getUsername() + ":" + UUID.randomUUID().toString();
        return Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private String hashValue(String value) {
        return DigestUtils.md5DigestAsHex(value.getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, Object> ok(String msg, Object data) {
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("code", 200);
        result.put("msg", msg);
        result.put("data", data);
        return result;
    }

    private Map<String, Object> fail(int code, String msg) {
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("code", code);
        result.put("msg", msg);
        result.put("data", null);
        return result;
    }
}