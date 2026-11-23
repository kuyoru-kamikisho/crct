package com.promilia.captcha;

import com.promilia.captcha.dto.CaptchaResponse;

public interface CaptchaService {

    CaptchaResponse create();

    void validateAndConsume(String captchaId, String captchaCode);
}
