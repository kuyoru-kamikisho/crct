package com.promilia.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.promilia.admin.dto.AdminBanRequest;
import com.promilia.admin.dto.AdminUpdateUserRequest;
import com.promilia.admin.dto.AdminUserView;
import com.promilia.common.api.PageResult;
import com.promilia.common.config.PromiliaProperties;
import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import com.promilia.common.util.LoginIpStore;
import com.promilia.user.EmailBanService;
import com.promilia.user.entity.EmailBan;
import com.promilia.user.entity.User;
import com.promilia.user.enums.UserRole;
import com.promilia.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private static final Set<String> ALLOWED_EXT = new HashSet<String>(Arrays.asList("jpg", "jpeg", "png", "webp"));
    private static final long MAX_AVATAR_SIZE = 2L * 1024 * 1024;

    private final UserMapper userMapper;
    private final EmailBanService emailBanService;
    private final PromiliaProperties properties;

    @Override
    public PageResult<AdminUserView> listUsers(long page, long size, String keyword) {
        long p = Math.max(page, 1);
        long s = Math.min(Math.max(size, 1), 100);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>().orderByDesc(User::getId);
        if (StringUtils.hasText(keyword)) {
            String kw = keyword.trim();
            wrapper.and(w -> w.like(User::getEmail, kw).or().like(User::getNickname, kw));
        }
        Page<User> result = userMapper.selectPage(new Page<User>(p, s), wrapper);
        List<AdminUserView> records = new ArrayList<AdminUserView>();
        for (User user : result.getRecords()) {
            records.add(toView(user));
        }
        return new PageResult<AdminUserView>(result.getTotal(), p, s, records);
    }

    @Override
    public AdminUserView getUser(Long userId) {
        return toView(requireUser(userId));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteUser(Long operatorId, Long userId) {
        if (operatorId.equals(userId)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "不能删除自己的账号");
        }
        User user = requireUser(userId);
        if (user.getRole() == UserRole.ADMIN) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "不能删除管理员账号");
        }
        // 释放邮箱/昵称唯一约束，便于未禁用邮箱再次注册
        String originalEmail = user.getEmail();
        user.setEmail("deleted_" + user.getId() + "_" + System.currentTimeMillis() + "@deleted.local");
        user.setNickname("deleted_" + user.getId() + "_" + System.currentTimeMillis());
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        userMapper.deleteById(userId);
        log.info("管理员删除用户 operatorId={} userId={} email={}", operatorId, userId, originalEmail);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AdminUserView banUser(Long operatorId, Long userId, AdminBanRequest request) {
        if (operatorId.equals(userId)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "不能禁用自己的账号");
        }
        User user = requireUser(userId);
        if (user.getRole() == UserRole.ADMIN) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "不能禁用管理员账号");
        }
        EmailBan ban = emailBanService.ban(user.getEmail(), request.getReason(), request.getBanUntil());
        user.setBanUntil(ban.getBanUntil());
        user.setBanReason(ban.getReason());
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        log.info("管理员禁用用户 operatorId={} userId={} until={}", operatorId, userId, ban.getBanUntil());
        return toView(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AdminUserView unbanUser(Long userId) {
        User user = requireUser(userId);
        emailBanService.unban(user.getEmail());
        user.setBanUntil(null);
        user.setBanReason(null);
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        return toView(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AdminUserView updateUser(Long operatorId, Long userId, AdminUpdateUserRequest request) {
        User user = requireUser(userId);
        if (StringUtils.hasText(request.getNickname())) {
            String nickname = request.getNickname().trim();
            Long count = userMapper.selectCount(new LambdaQueryWrapper<User>()
                    .eq(User::getNickname, nickname)
                    .ne(User::getId, userId));
            if (count != null && count > 0) {
                throw new BusinessException(ErrorCode.NICKNAME_EXISTS);
            }
            user.setNickname(nickname);
        }
        if (request.getSignature() != null) {
            user.setSignature(request.getSignature());
        }
        if (request.getBirthday() != null) {
            user.setBirthday(request.getBirthday());
            user.setAge(calcAge(request.getBirthday()));
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender());
        }
        if (request.getRole() != null) {
            if (operatorId.equals(userId) && request.getRole() != UserRole.ADMIN) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "不能取消自己的管理员身份");
            }
            user.setRole(request.getRole());
        }
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        return toView(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String uploadAvatar(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.AVATAR_INVALID, "请上传头像文件");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new BusinessException(ErrorCode.AVATAR_INVALID, "头像文件不能超过 2MB");
        }
        String original = file.getOriginalFilename();
        String ext = FilenameUtils.getExtension(original == null ? "" : original).toLowerCase();
        if (!ALLOWED_EXT.contains(ext)) {
            throw new BusinessException(ErrorCode.AVATAR_INVALID, "仅允许 jpg/png/webp 图片");
        }
        try {
            Path dir = Paths.get(properties.getUpload().getAvatarDir()).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String filename = userId + "_" + UUID.randomUUID().toString().replace("-", "") + "." + ext;
            Path target = dir.resolve(filename);
            file.transferTo(target.toFile());
            String avatarUrl = "/avatars/" + filename;
            User user = requireUser(userId);
            user.setAvatarUrl(avatarUrl);
            user.setUpdatedAt(LocalDateTime.now());
            userMapper.updateById(user);
            return avatarUrl;
        } catch (IOException e) {
            log.error("管理员上传头像失败 userId={}", userId, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "头像保存失败");
        }
    }

    private User requireUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        return user;
    }

    private Integer calcAge(LocalDate birthday) {
        if (birthday == null) {
            return null;
        }
        int age = Period.between(birthday, LocalDate.now()).getYears();
        if (age < 0 || age > 120) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "生日对应年龄需在 0~120");
        }
        return age;
    }

    private AdminUserView toView(User user) {
        EmailBan ban = emailBanService.findActiveBan(user.getEmail());
        return AdminUserView.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .avatarUrl(user.getAvatarUrl())
                .signature(user.getSignature())
                .birthday(user.getBirthday())
                .age(user.getAge())
                .gender(user.getGender())
                .role(user.getRole() == null ? UserRole.USER : user.getRole())
                .banned(ban != null)
                .banUntil(ban != null ? ban.getBanUntil() : null)
                .banReason(ban != null ? ban.getReason() : null)
                .loginIps(LoginIpStore.parse(user.getLoginIps()))
                .ipLocation(user.getIpLocation())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
