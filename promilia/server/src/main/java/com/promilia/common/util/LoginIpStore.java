package com.promilia.common.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/** 登录 IP JSON 数组读写（最新在前，最多 maxSize 条） */
public final class LoginIpStore {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<List<String>>() {
    };

    private LoginIpStore() {
    }

    public static List<String> parse(String json) {
        if (!StringUtils.hasText(json)) {
            return new ArrayList<String>();
        }
        try {
            List<String> list = MAPPER.readValue(json, LIST_TYPE);
            return list == null ? new ArrayList<String>() : new ArrayList<String>(list);
        } catch (Exception e) {
            return new ArrayList<String>();
        }
    }

    public static String push(String json, String ip, int maxSize) {
        if (!StringUtils.hasText(ip)) {
            return json;
        }
        List<String> list = parse(json);
        // 若与最新一条相同则不重复写入
        if (!list.isEmpty() && ip.equals(list.get(0))) {
            return toJson(list);
        }
        list.remove(ip);
        list.add(0, ip);
        while (list.size() > maxSize) {
            list.remove(list.size() - 1);
        }
        return toJson(list);
    }

    public static String toJson(List<String> list) {
        try {
            return MAPPER.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }
}
