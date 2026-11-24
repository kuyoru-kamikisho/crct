package com.promilia.auth;

import com.promilia.auth.dto.ForgotPasswordRequest;
import com.promilia.auth.dto.LoginRequest;
import com.promilia.auth.dto.LoginResponse;
import com.promilia.auth.dto.PasswordPublicKeyResponse;
import com.promilia.auth.dto.RegisterConfirmRequest;
import com.promilia.auth.dto.RegisterSendCodeRequest;
import com.promilia.auth.dto.ResetPasswordRequest;
import com.promilia.common.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordCryptoService passwordCryptoService;

    @GetMapping("/password-public-key")
    public ApiResponse<PasswordPublicKeyResponse> passwordPublicKey() {
        return ApiResponse.ok(new PasswordPublicKeyResponse(
                passwordCryptoService.getPublicKeyBase64(),
                "RSA-OAEP-SHA256"
        ));
    }

    @PostMapping("/register/send-code")
    public ApiResponse<Map<String, String>> sendRegisterCode(@Validated @RequestBody RegisterSendCodeRequest request) {
        Map<String, String> data = authService.sendRegisterCode(request);
        return data == null ? ApiResponse.<Map<String, String>>ok() : ApiResponse.ok(data);
    }

    @PostMapping("/register")
    public ApiResponse<Map<String, Long>> register(@Validated @RequestBody RegisterConfirmRequest request) {
        Long userId = authService.register(request);
        return ApiResponse.ok(Collections.singletonMap("userId", userId));
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Validated @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Validated @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ApiResponse.ok();
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Validated @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.ok();
    }
}
