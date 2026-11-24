package com.promilia.character.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum CharacterRace {
    HUMAN("人类"),
    ELF("精灵族"),
    DWARF("矮人族"),
    ORC("兽人"),
    DRAGON("龙族"),
    DEMON("魔族"),
    ANGEL("天使"),
    DEVIL("恶魔"),
    MACHINE("机械"),
    BEASTKIN("兽耳"),
    OTHER("其他");

    @JsonValue
    private final String label;

    CharacterRace(String label) {
        this.label = label;
    }

    @JsonCreator
    public static CharacterRace from(String value) {
        if (value == null) {
            return null;
        }
        String v = value.trim();
        for (CharacterRace race : values()) {
            if (race.name().equalsIgnoreCase(v) || race.label.equals(v)) {
                return race;
            }
        }
        throw new IllegalArgumentException("非法种族: " + value);
    }
}
