package com.promilia.character.dto;

import com.promilia.user.enums.Gender;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
public class CreateCharacterRequest {

    @NotBlank(message = "角色名不能为空")
    @Size(max = 64, message = "角色名过长")
    private String name;

    @NotNull(message = "性别不能为空")
    private Gender gender;
}
