package com.promilia.character.dto;

import com.promilia.user.enums.Gender;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CharacterListItem {
    private Long id;
    private String name;
    private Gender gender;
    private String imageUrl;
    private String height;
    private String weight;
    private String measurements;
    private String cupSize;
    private String race;
    private String birthday;
    private String birthdayDisplay;
    private String rating;
    private boolean canDelete;
}
