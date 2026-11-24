package com.promilia.character.dto;

import lombok.Data;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

@Data
public class VoteFieldRequest {

    @NotNull(message = "评分不能为空")
    @Min(value = 1, message = "评分最低 1")
    @Max(value = 5, message = "评分最高 5")
    private Integer score;
}
