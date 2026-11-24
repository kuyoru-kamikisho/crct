package com.promilia.common.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LoginIpStoreTest {

    @Test
    void push_keepsNewestFirstAndMaxSize() {
        String json = null;
        json = LoginIpStore.push(json, "1.1.1.1", 3);
        json = LoginIpStore.push(json, "2.2.2.2", 3);
        json = LoginIpStore.push(json, "3.3.3.3", 3);
        json = LoginIpStore.push(json, "4.4.4.4", 3);
        List<String> list = LoginIpStore.parse(json);
        assertEquals(3, list.size());
        assertEquals("4.4.4.4", list.get(0));
        assertEquals("3.3.3.3", list.get(1));
        assertEquals("2.2.2.2", list.get(2));
    }

    @Test
    void push_sameLatestIp_noDuplicate() {
        String json = LoginIpStore.push(null, "1.1.1.1", 10);
        json = LoginIpStore.push(json, "1.1.1.1", 10);
        assertEquals(1, LoginIpStore.parse(json).size());
    }
}
