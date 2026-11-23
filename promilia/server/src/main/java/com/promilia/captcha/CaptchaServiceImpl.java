package com.promilia.captcha;

import com.promilia.captcha.dto.CaptchaResponse;
import com.promilia.common.config.PromiliaProperties;
import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import com.promilia.common.redis.RedisKeys;
import com.promilia.common.util.CodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class CaptchaServiceImpl implements CaptchaService {

    private final StringRedisTemplate stringRedisTemplate;
    private final PromiliaProperties properties;

    @Override
    public CaptchaResponse create() {
        String code = CodeGenerator.captchaText(4);
        String captchaId = CodeGenerator.token();
        stringRedisTemplate.opsForValue().set(
                RedisKeys.captcha(captchaId),
                code,
                properties.getAuth().getCaptchaTtlSeconds(),
                TimeUnit.SECONDS
        );
        return new CaptchaResponse(captchaId, renderBase64(code));
    }

    @Override
    public void validateAndConsume(String captchaId, String captchaCode) {
        if (!StringUtils.hasText(captchaId) || !StringUtils.hasText(captchaCode)) {
            throw new BusinessException(ErrorCode.CAPTCHA_INVALID);
        }
        String key = RedisKeys.captcha(captchaId);
        String cached = stringRedisTemplate.opsForValue().get(key);
        stringRedisTemplate.delete(key);
        if (!StringUtils.hasText(cached) || !cached.equalsIgnoreCase(captchaCode.trim())) {
            throw new BusinessException(ErrorCode.CAPTCHA_INVALID);
        }
    }

    private String renderBase64(String code) {
        int width = 120;
        int height = 40;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(new Color(245, 245, 245));
        g.fillRect(0, 0, width, height);
        g.setFont(new Font("Arial", Font.BOLD, 24));
        g.setColor(new Color(30, 30, 30));
        g.drawString(code, 20, 28);
        g.setColor(new Color(180, 180, 180));
        for (int i = 0; i < 6; i++) {
            g.drawLine(i * 20, 0, width - i * 10, height);
        }
        g.dispose();
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "验证码生成失败");
        }
    }
}
