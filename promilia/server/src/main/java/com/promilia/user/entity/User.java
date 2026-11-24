package com.promilia.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.promilia.user.enums.Gender;
import com.promilia.user.enums.UserRole;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("t_user")
public class User {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String email;

    private String passwordHash;

    private String nickname;

    private String avatarUrl;

    private String signature;

    private LocalDate birthday;

    private Integer age;

    private Gender gender;

    private UserRole role;

    private LocalDateTime banUntil;

    private String banReason;

    /** JSON 数组字符串，如 ["1.2.3.4","5.6.7.8"]，最新在前，最多 10 条 */
    private String loginIps;

    private String ipLocation;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
