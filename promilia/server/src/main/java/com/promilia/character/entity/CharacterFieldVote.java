package com.promilia.character.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_character_field_vote")
public class CharacterFieldVote {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long fieldValueId;

    private Long userId;

    private Integer score;

    private LocalDateTime createdAt;
}
