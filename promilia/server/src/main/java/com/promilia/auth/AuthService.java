package com.promilia.auth;

import com.promilia.auth.dto.ForgotPasswordRequest;
import com.promilia.auth.dto.LoginRequest;
import com.promilia.auth.dto.LoginResponse;
import com.promilia.auth.dto.RegisterConfirmRequest;
import com.promilia.auth.dto.RegisterSendCodeRequest;
import com.promilia.auth.dto.ResetPasswordRequest;

public interface AuthService {

    void sendRegisterCode(RegisterSendCodeRequest request);

    Long register(RegisterConfirmRequest request);

    LoginResponse login(LoginRequest request);

    void forgotPassword(ForgotPasswordRequest request);

    void resetPassword(ResetPasswordRequest request);
}
