package com.promilia.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_email_ban")
public class EmailBan {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String email;

    private String reason;

    /** 到期时间；null 表示永久禁用 */
    private LocalDateTime banUntil;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
