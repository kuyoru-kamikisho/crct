package com.promilia.common.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class IpLocationResolverTest {

    private final IpLocationResolver resolver = new IpLocationResolver();

    @Test
    void localIp() {
        assertEquals("本地", resolver.resolve("127.0.0.1"));
    }

    @Test
    void privateIp() {
        assertEquals("内网", resolver.resolve("192.168.1.1"));
    }
}
