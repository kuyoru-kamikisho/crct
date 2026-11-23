package com.promilia.user;

import com.promilia.common.api.ApiResponse;
import com.promilia.common.security.UserContext;
import com.promilia.user.dto.UpdateProfileRequest;
import com.promilia.user.dto.UserProfileResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ApiResponse<UserProfileResponse> profile() {
        return ApiResponse.ok(userService.getProfile(UserContext.getUserId()));
    }

    @PutMapping("/profile")
    public ApiResponse<UserProfileResponse> updateProfile(@Validated @RequestBody UpdateProfileRequest request,
                                                          HttpServletRequest httpRequest) {
        return ApiResponse.ok(userService.updateProfile(UserContext.getUserId(), request, httpRequest));
    }

    @PostMapping("/avatar")
    public ApiResponse<Map<String, String>> uploadAvatar(@RequestParam("file") MultipartFile file) {
        String url = userService.uploadAvatar(UserContext.getUserId(), file);
        return ApiResponse.ok(Collections.singletonMap("avatarUrl", url));
    }
}
