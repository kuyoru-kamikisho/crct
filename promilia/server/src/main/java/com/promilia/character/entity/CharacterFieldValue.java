package com.promilia.character.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.promilia.character.enums.CharacterFieldType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_character_field_value")
public class CharacterFieldValue {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long characterId;

    private Long userId;

    private CharacterFieldType fieldType;

    private String valueText;

    private String source;

    private LocalDateTime createdAt;
}
