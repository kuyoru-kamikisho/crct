package com.promilia.auth;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.promilia.common.exception.ErrorCode;
import com.promilia.mail.MailService;
import com.promilia.support.TestSupport;
import com.promilia.user.entity.User;
import com.promilia.user.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthAndUserIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private UserMapper userMapper;

    @MockBean
    private MailService mailService;

    private String uniqueEmail;
    private String uniqueNickname;

    @BeforeEach
    void setUp() {
        uniqueEmail = "user_" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        uniqueNickname = "nick_" + UUID.randomUUID().toString().substring(0, 8);
        reset(mailService);
        doNothing().when(mailService).sendVerifyCodeMail(anyString(), anyString());
        doNothing().when(mailService).sendResetPasswordMail(anyString(), anyString());
        clearRedisKeys();
    }

    @Test
    @Order(1)
    void captcha_shouldReturnImage() throws Exception {
        mockMvc.perform(get("/api/captcha"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.captchaId").isNotEmpty())
                .andExpect(jsonPath("$.data.imageBase64").isNotEmpty());
    }

    @Test
    @Order(2)
    void register_login_profile_fullFlow() throws Exception {
        // 1) 错误验证码
        mockMvc.perform(post("/api/auth/register/send-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sendCodeBody(uniqueEmail, uniqueNickname, "bad", "XXXX"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ErrorCode.CAPTCHA_INVALID.getCode()));

        // 2) 发送注册验证码
        String[] captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/register/send-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                sendCodeBody(uniqueEmail, uniqueNickname, captcha[0], captcha[1]))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
        verify(mailService).sendVerifyCodeMail(eq(uniqueEmail.toLowerCase()), anyString());

        String emailCode = TestSupport.emailCode(stringRedisTemplate, uniqueEmail);
        assertNotNull(emailCode);
        assertTrue(emailCode.matches("[A-Z0-9]{6}"));

        // 3) 邮箱验证码错误
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                registerBody(uniqueEmail, "XXXXXX", "Passw0rd", uniqueNickname))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ErrorCode.EMAIL_CODE_INVALID.getCode()));

        // 重新发送验证码（间隔配置为 1 秒）
        Thread.sleep(1100);
        captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/register/send-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                sendCodeBody(uniqueEmail, uniqueNickname, captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(0));
        emailCode = TestSupport.emailCode(stringRedisTemplate, uniqueEmail);

        // 4) 注册成功
        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                registerBody(uniqueEmail, emailCode, "Passw0rd", uniqueNickname))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.userId").isNumber())
                .andReturn();
        long userId = TestSupport.json(objectMapper, registerResult).path("data").path("userId").asLong();

        User user = userMapper.selectById(userId);
        assertNotNull(user);
        assertTrue(user.getPasswordHash() != null && !user.getPasswordHash().equals("Passw0rd"));

        // 5) 昵称重复
        String otherEmail = "other_" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        Thread.sleep(1100);
        captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/register/send-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                sendCodeBody(otherEmail, uniqueNickname, captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(ErrorCode.NICKNAME_EXISTS.getCode()));

        // 6) 登录失败：错误密码
        captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                loginBody(uniqueEmail, "wrong", captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(ErrorCode.PASSWORD_INVALID.getCode()));

        // 7) 登录成功
        captcha = createCaptcha();
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                loginBody(uniqueEmail, "Passw0rd", captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andReturn();
        String token = TestSupport.json(objectMapper, loginResult).path("data").path("token").asText();

        // 8) 未登录访问资料
        mockMvc.perform(get("/api/user/profile"))
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHORIZED.getCode()));

        // 9) 完善资料 + IP 自动填充
        mockMvc.perform(put("/api/user/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Forwarded-For", "8.8.8.8")
                        .content("{\"signature\":\"hello world\",\"birthday\":\"2000-01-02\",\"gender\":1}"))
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.signature").value("hello world"))
                .andExpect(jsonPath("$.data.age").value(org.hamcrest.Matchers.any(Number.class)))
                .andExpect(jsonPath("$.data.gender").value(1))
                .andExpect(jsonPath("$.data.ipLocation").isNotEmpty());

        // 10) 上传头像成功
        MockMultipartFile avatar = new MockMultipartFile(
                "file", "avatar.png", "image/png", pngBytes());
        mockMvc.perform(multipart("/api/user/avatar")
                        .file(avatar)
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.avatarUrl").value(org.hamcrest.Matchers.startsWith("/avatars/")));

        // 11) 非法头像格式
        MockMultipartFile badAvatar = new MockMultipartFile(
                "file", "a.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8));
        mockMvc.perform(multipart("/api/user/avatar")
                        .file(badAvatar)
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.code").value(ErrorCode.AVATAR_INVALID.getCode()));

        // 12) 忘记密码 + 重置
        captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                forgotBody(uniqueEmail, captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(0));

        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendResetPasswordMail(eq(uniqueEmail.toLowerCase()), linkCaptor.capture());
        String resetToken = extractToken(linkCaptor.getValue());
        assertNotNull(resetToken);

        captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                resetBody(resetToken, "NewPass1", captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(0));

        // Token 一次性：再次使用失败
        captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                resetBody(resetToken, "NewPass2", captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(ErrorCode.RESET_TOKEN_INVALID.getCode()));

        // 新密码可登录
        captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                loginBody(uniqueEmail, "NewPass1", captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    @Order(3)
    void sendCode_tooFast_shouldFail() throws Exception {
        String email = "fast_" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        String nickname = "fast_" + UUID.randomUUID().toString().substring(0, 8);
        String[] captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/register/send-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                sendCodeBody(email, nickname, captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(0));

        captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/register/send-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                sendCodeBody(email, nickname, captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(ErrorCode.EMAIL_CODE_SEND_TOO_FAST.getCode()));
    }

    @Test
    @Order(4)
    void forgotPassword_emailNotFound() throws Exception {
        String[] captcha = createCaptcha();
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                forgotBody("missing_" + UUID.randomUUID() + "@example.com", captcha[0], captcha[1]))))
                .andExpect(jsonPath("$.code").value(ErrorCode.EMAIL_NOT_FOUND.getCode()));
    }

    @Test
    @Order(5)
    void captcha_isOneTime() throws Exception {
        String[] captcha = createCaptcha();
        String body = objectMapper.writeValueAsString(
                loginBody("nobody@example.com", "x", captcha[0], captcha[1]));
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(jsonPath("$.code").value(ErrorCode.PASSWORD_INVALID.getCode()));
        // 验证码已消费，再次使用应失败
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(jsonPath("$.code").value(ErrorCode.CAPTCHA_INVALID.getCode()));
    }

    private String[] createCaptcha() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/captcha"))
                .andExpect(jsonPath("$.code").value(0))
                .andReturn();
        JsonNode data = TestSupport.json(objectMapper, result).path("data");
        String captchaId = data.path("captchaId").asText();
        String code = TestSupport.captchaCode(stringRedisTemplate, captchaId);
        assertNotNull(code);
        return new String[]{captchaId, code};
    }

    private void clearRedisKeys() {
        Set<String> keys = stringRedisTemplate.keys("*");
        if (keys != null && !keys.isEmpty()) {
            stringRedisTemplate.delete(keys);
        }
        userMapper.delete(new LambdaQueryWrapper<User>().likeRight(User::getEmail, "user_"));
        userMapper.delete(new LambdaQueryWrapper<User>().likeRight(User::getEmail, "other_"));
        userMapper.delete(new LambdaQueryWrapper<User>().likeRight(User::getEmail, "fast_"));
    }

    private static java.util.Map<String, String> sendCodeBody(String email, String nickname, String id, String code) {
        java.util.Map<String, String> map = new java.util.HashMap<String, String>();
        map.put("email", email);
        map.put("nickname", nickname);
        map.put("captchaId", id);
        map.put("captchaCode", code);
        return map;
    }

    private static java.util.Map<String, String> registerBody(String email, String emailCode, String password, String nickname) {
        java.util.Map<String, String> map = new java.util.HashMap<String, String>();
        map.put("email", email);
        map.put("emailCode", emailCode);
        map.put("password", password);
        map.put("nickname", nickname);
        return map;
    }

    private static java.util.Map<String, String> loginBody(String email, String password, String id, String code) {
        java.util.Map<String, String> map = new java.util.HashMap<String, String>();
        map.put("email", email);
        map.put("password", password);
        map.put("captchaId", id);
        map.put("captchaCode", code);
        return map;
    }

    private static java.util.Map<String, String> forgotBody(String email, String id, String code) {
        java.util.Map<String, String> map = new java.util.HashMap<String, String>();
        map.put("email", email);
        map.put("captchaId", id);
        map.put("captchaCode", code);
        return map;
    }

    private static java.util.Map<String, String> resetBody(String token, String password, String id, String code) {
        java.util.Map<String, String> map = new java.util.HashMap<String, String>();
        map.put("resetToken", token);
        map.put("newPassword", password);
        map.put("captchaId", id);
        map.put("captchaCode", code);
        return map;
    }

    private static String extractToken(String link) {
        int idx = link.indexOf("token=");
        return idx >= 0 ? link.substring(idx + 6) : null;
    }

    private static byte[] pngBytes() {
        // 最小合法 PNG
        return new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x02, 0x00, 0x00, 0x00, (byte) 0x90, 0x77, 0x53,
                (byte) 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
                0x54, 0x08, (byte) 0xD7, 0x63, (byte) 0xF8, (byte) 0xCF,
                (byte) 0xC0, 0x00, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00,
                0x05, (byte) 0xFE, (byte) 0xD4, (byte) 0xEF, 0x00, 0x00,
                0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, (byte) 0xAE, 0x42,
                0x60, (byte) 0x82
        };
    }
}
