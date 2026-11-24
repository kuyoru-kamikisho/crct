package com.promilia.user;

import com.promilia.user.dto.ChangePasswordRequest;
import com.promilia.user.dto.UpdateProfileRequest;
import com.promilia.user.dto.UserProfileResponse;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;

public interface UserService {

    UserProfileResponse getProfile(Long userId);

    UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request, HttpServletRequest httpRequest);

    String uploadAvatar(Long userId, MultipartFile file);

    void changePassword(Long userId, ChangePasswordRequest request);
}
