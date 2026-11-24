package com.promilia.admin;

import com.promilia.admin.dto.AdminBanRequest;
import com.promilia.admin.dto.AdminUpdateUserRequest;
import com.promilia.admin.dto.AdminUserView;
import com.promilia.common.api.ApiResponse;
import com.promilia.common.api.PageResult;
import com.promilia.common.security.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ApiResponse<PageResult<AdminUserView>> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) String keyword) {
        return ApiResponse.ok(adminUserService.listUsers(page, size, keyword));
    }

    @GetMapping("/{id}")
    public ApiResponse<AdminUserView> detail(@PathVariable("id") Long id) {
        return ApiResponse.ok(adminUserService.getUser(id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") Long id) {
        adminUserService.deleteUser(UserContext.getUserId(), id);
        return ApiResponse.ok();
    }

    @PostMapping("/{id}/ban")
    public ApiResponse<AdminUserView> ban(@PathVariable("id") Long id,
                                          @Validated @RequestBody AdminBanRequest request) {
        return ApiResponse.ok(adminUserService.banUser(UserContext.getUserId(), id, request));
    }

    @PostMapping("/{id}/unban")
    public ApiResponse<AdminUserView> unban(@PathVariable("id") Long id) {
        return ApiResponse.ok(adminUserService.unbanUser(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<AdminUserView> update(@PathVariable("id") Long id,
                                             @Validated @RequestBody AdminUpdateUserRequest request) {
        return ApiResponse.ok(adminUserService.updateUser(UserContext.getUserId(), id, request));
    }

    @PostMapping("/{id}/avatar")
    public ApiResponse<Map<String, String>> avatar(@PathVariable("id") Long id,
                                                   @RequestParam("file") MultipartFile file) {
        String url = adminUserService.uploadAvatar(id, file);
        return ApiResponse.ok(Collections.singletonMap("avatarUrl", url));
    }
}
