package com.promilia.user;

import com.promilia.common.config.PromiliaProperties;
import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import com.promilia.common.util.IpLocationResolver;
import com.promilia.common.util.IpUtils;
import com.promilia.user.dto.UpdateProfileRequest;
import com.promilia.user.dto.UserProfileResponse;
import com.promilia.user.entity.User;
import com.promilia.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private static final Set<String> ALLOWED_EXT = new HashSet<String>(Arrays.asList("jpg", "jpeg", "png", "webp"));
    private static final long MAX_AVATAR_SIZE = 2L * 1024 * 1024;

    private final UserMapper userMapper;
    private final PromiliaProperties properties;
    private final IpLocationResolver ipLocationResolver;

    @Override
    public UserProfileResponse getProfile(Long userId) {
        return toResponse(requireUser(userId));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request, HttpServletRequest httpRequest) {
        User user = requireUser(userId);
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
        String ip = IpUtils.resolveClientIp(httpRequest);
        user.setIpLocation(ipLocationResolver.resolve(ip));
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        return toResponse(user);
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
        String contentType = file.getContentType();
        if (StringUtils.hasText(contentType) && !contentType.startsWith("image/")) {
            throw new BusinessException(ErrorCode.AVATAR_INVALID, "仅允许图片格式");
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
            log.info("头像上传成功 userId={} path={}", userId, avatarUrl);
            return avatarUrl;
        } catch (IOException e) {
            log.error("头像保存失败 userId={}", userId, e);
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

    private UserProfileResponse toResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .avatarUrl(user.getAvatarUrl())
                .signature(user.getSignature())
                .birthday(user.getBirthday())
                .age(user.getAge())
                .gender(user.getGender())
                .ipLocation(user.getIpLocation())
                .build();
    }
}
