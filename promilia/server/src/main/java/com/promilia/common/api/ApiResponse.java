package com.promilia.common.api;

import com.promilia.common.exception.ErrorCode;
import lombok.Data;

@Data
public class ApiResponse<T> {

    private int code;
    private String message;
    private T data;

    public static <T> ApiResponse<T> ok(T data) {
        ApiResponse<T> resp = new ApiResponse<T>();
        resp.setCode(ErrorCode.SUCCESS.getCode());
        resp.setMessage(ErrorCode.SUCCESS.getMessage());
        resp.setData(data);
        return resp;
    }

    public static <T> ApiResponse<T> ok() {
        return ok(null);
    }

    public static <T> ApiResponse<T> fail(ErrorCode errorCode) {
        ApiResponse<T> resp = new ApiResponse<T>();
        resp.setCode(errorCode.getCode());
        resp.setMessage(errorCode.getMessage());
        return resp;
    }

    public static <T> ApiResponse<T> fail(ErrorCode errorCode, String message) {
        ApiResponse<T> resp = new ApiResponse<T>();
        resp.setCode(errorCode.getCode());
        resp.setMessage(message);
        return resp;
    }

    public static <T> ApiResponse<T> fail(int code, String message) {
        ApiResponse<T> resp = new ApiResponse<T>();
        resp.setCode(code);
        resp.setMessage(message);
        return resp;
    }
}
