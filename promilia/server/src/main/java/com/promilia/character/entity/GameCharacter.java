package com.promilia.character.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.promilia.user.enums.Gender;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_game_character")
public class GameCharacter {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private Gender gender;

    private String imageUrl;

    private Long createdBy;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
