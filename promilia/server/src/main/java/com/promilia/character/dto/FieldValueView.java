package com.promilia.character.dto;

import com.promilia.character.enums.CharacterFieldType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FieldValueView {
    private Long id;
    private CharacterFieldType fieldType;
    private String valueText;
    private String displayValue;
    private String source;
    private Long userId;
    private String nickname;
    private double avgScore;
    private int voteCount;
    private Integer myVote;
    private LocalDateTime createdAt;
}
