package com.promilia.auth;

import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordCryptoServiceTest {

    private PasswordCryptoService cryptoService;

    @BeforeEach
    void setUp() throws Exception {
        cryptoService = new PasswordCryptoService();
        cryptoService.init();
    }

    @Test
    void encryptDecrypt_roundTrip() {
        String plain = "Passw0rd!";
        String cipher = cryptoService.encrypt(plain);
        assertNotEquals(plain, cipher);
        assertEquals(plain, cryptoService.decrypt(cipher));
    }

    @Test
    void publicKey_isBase64Spki() {
        String key = cryptoService.getPublicKeyBase64();
        assertTrue(key.length() > 100);
        // 明文密码解密应失败
        BusinessException ex = assertThrows(BusinessException.class,
                () -> cryptoService.decrypt("not-a-cipher"));
        assertEquals(ErrorCode.PASSWORD_CIPHER_INVALID.getCode(), ex.getCode());
    }
}
