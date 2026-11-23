package com.promilia.common.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CodeGeneratorTest {

    @Test
    void emailCode_shouldBeUpperAlphanumeric() {
        String code = CodeGenerator.emailCode(6);
        assertEquals(6, code.length());
        assertTrue(code.matches("[A-Z0-9]{6}"));
    }

    @Test
    void token_shouldBeNonEmpty() {
        String token = CodeGenerator.token();
        assertTrue(token.length() >= 16);
        assertTrue(token.matches("[a-f0-9]+"));
    }
}
