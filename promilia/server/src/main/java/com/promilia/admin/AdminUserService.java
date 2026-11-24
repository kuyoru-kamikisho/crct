package com.promilia.admin;

import com.promilia.admin.dto.AdminBanRequest;
import com.promilia.admin.dto.AdminUpdateUserRequest;
import com.promilia.admin.dto.AdminUserView;
import com.promilia.common.api.PageResult;
import org.springframework.web.multipart.MultipartFile;

public interface AdminUserService {

    PageResult<AdminUserView> listUsers(long page, long size, String keyword);

    AdminUserView getUser(Long userId);

    void deleteUser(Long operatorId, Long userId);

    AdminUserView banUser(Long operatorId, Long userId, AdminBanRequest request);

    AdminUserView unbanUser(Long userId);

    AdminUserView updateUser(Long operatorId, Long userId, AdminUpdateUserRequest request);

    String uploadAvatar(Long userId, MultipartFile file);
}
