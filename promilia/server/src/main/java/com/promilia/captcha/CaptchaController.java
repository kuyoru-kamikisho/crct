package com.promilia.captcha;

import com.promilia.captcha.dto.CaptchaResponse;
import com.promilia.common.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/captcha")
@RequiredArgsConstructor
public class CaptchaController {

    private final CaptchaService captchaService;

    @GetMapping
    public ApiResponse<CaptchaResponse> create() {
        return ApiResponse.ok(captchaService.create());
    }
}
