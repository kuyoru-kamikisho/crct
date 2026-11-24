package com.promilia.character.dto;

import com.promilia.user.enums.Gender;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class CharacterDetailResponse {
    private Long id;
    private String name;
    private Gender gender;
    private String imageUrl;
    /** 各字段投稿列表（含出处与打分） */
    private Map<String, List<FieldValueView>> fieldValues;
    /** 当前用户已提交过的字段 */
    private List<String> mySubmittedFields;
    private List<CommentView> comments;
}
