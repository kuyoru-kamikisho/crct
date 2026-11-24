package com.promilia.character.dto;

import com.promilia.character.enums.CharacterFieldType;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
public class SubmitFieldRequest {

    @NotNull(message = "字段类型不能为空")
    private CharacterFieldType fieldType;

    @NotBlank(message = "数值不能为空")
    @Size(max = 128, message = "数值过长")
    private String value;

    @NotBlank(message = "数据出处不能为空")
    @Size(max = 512, message = "数据出处过长")
    private String source;
}
