package com.promilia.auth;

import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.annotation.PostConstruct;
import javax.crypto.Cipher;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.MGF1ParameterSpec;
import java.util.Base64;

/**
 * 传输层密码加密：前端用公钥 RSA-OAEP(SHA-256) 加密，后端私钥解密后再做 BCrypt。
 * 与浏览器 Web Crypto API 对齐（OAEP digest / MGF1 均为 SHA-256）。
 */
@Slf4j
@Service
public class PasswordCryptoService {

    private static final String TRANSFORMATION = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding";
    private static final OAEPParameterSpec OAEP_SHA256 = new OAEPParameterSpec(
            "SHA-256",
            "MGF1",
            MGF1ParameterSpec.SHA256,
            PSource.PSpecified.DEFAULT
    );

    private PublicKey publicKey;
    private PrivateKey privateKey;
    private String publicKeyBase64;

    @PostConstruct
    public void init() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair keyPair = generator.generateKeyPair();
        this.publicKey = keyPair.getPublic();
        this.privateKey = keyPair.getPrivate();
        this.publicKeyBase64 = Base64.getEncoder().encodeToString(publicKey.getEncoded());
        log.info("密码传输 RSA 密钥已生成（X.509 SubjectPublicKeyInfo / RSA-OAEP SHA-256）");
    }

    /** 给前端的 Base64(SPKI) 公钥 */
    public String getPublicKeyBase64() {
        return publicKeyBase64;
    }

    public String decrypt(String cipherBase64) {
        if (!StringUtils.hasText(cipherBase64)) {
            throw new BusinessException(ErrorCode.PASSWORD_CIPHER_INVALID);
        }
        try {
            byte[] encrypted = Base64.getDecoder().decode(cipherBase64.trim());
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, privateKey, OAEP_SHA256);
            byte[] plain = cipher.doFinal(encrypted);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("密码密文解密失败: {}", e.toString());
            throw new BusinessException(ErrorCode.PASSWORD_CIPHER_INVALID);
        }
    }

    /** 供单测 / 联调用公钥加密 */
    public String encrypt(String plainText) {
        if (!StringUtils.hasText(plainText)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "密码不能为空");
        }
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, publicKey, OAEP_SHA256);
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("密码加密失败", e);
        }
    }
}
