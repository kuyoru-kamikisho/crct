package com.promilia.auth;

import com.promilia.auth.dto.ForgotPasswordRequest;
import com.promilia.auth.dto.LoginRequest;
import com.promilia.auth.dto.LoginResponse;
import com.promilia.auth.dto.RegisterConfirmRequest;
import com.promilia.auth.dto.RegisterSendCodeRequest;
import com.promilia.auth.dto.ResetPasswordRequest;

import java.util.Map;

public interface AuthService {

    /**
     * @return mock 模式下返回含 emailCode 的 map，便于本地联调；正式发信返回 null
     */
    Map<String, String> sendRegisterCode(RegisterSendCodeRequest request);

    Long register(RegisterConfirmRequest request);

    LoginResponse login(LoginRequest request);

    void forgotPassword(ForgotPasswordRequest request);

    void resetPassword(ResetPasswordRequest request);
}
