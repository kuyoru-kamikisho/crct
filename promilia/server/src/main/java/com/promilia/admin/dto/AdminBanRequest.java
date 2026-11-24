package com.promilia.admin.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Data
public class AdminBanRequest {

    @NotBlank(message = "禁用理由不能为空")
    private String reason;

    /** 禁用截止时间；为空表示永久禁用 */
    private LocalDateTime banUntil;
}
