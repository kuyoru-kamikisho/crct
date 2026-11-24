package com.promilia.character.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_character_comment")
public class CharacterComment {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long characterId;

    private Long userId;

    private String contentText;

    /** JSON 数组字符串，如 ["/comment-images/a.png"]；预留表情包扩展 */
    private String imagesJson;

    private LocalDateTime createdAt;
}
