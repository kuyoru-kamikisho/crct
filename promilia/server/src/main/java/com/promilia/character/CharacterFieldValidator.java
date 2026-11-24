package com.promilia.character;

import com.promilia.character.enums.CharacterFieldType;
import com.promilia.character.enums.CharacterRace;
import com.promilia.character.enums.CupSize;
import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.regex.Pattern;

final class CharacterFieldValidator {

    private static final Pattern MEASUREMENTS = Pattern.compile(
            "^\\d+(\\.\\d+)?/\\d+(\\.\\d+)?/\\d+(\\.\\d+)?$");
    private static final Pattern BIRTHDAY = Pattern.compile(
            "^(0?[1-9]|1[0-2])-(0?[1-9]|[12]\\d|3[01])$");

    private CharacterFieldValidator() {
    }

    static String normalize(CharacterFieldType type, String raw) {
        if (!StringUtils.hasText(raw)) {
            throw new BusinessException(ErrorCode.FIELD_VALUE_INVALID, "数值不能为空");
        }
        String value = raw.trim();
        switch (type) {
            case HEIGHT:
            case WEIGHT:
                return normalizePositiveNumber(value, type == CharacterFieldType.HEIGHT ? "身高" : "体重");
            case MEASUREMENTS:
                if (!MEASUREMENTS.matcher(value).matches()) {
                    throw new BusinessException(ErrorCode.FIELD_VALUE_INVALID, "三围格式应为 数字/数字/数字，如 90/60/90");
                }
                return value;
            case CUP_SIZE:
                try {
                    return CupSize.from(value).name();
                } catch (Exception e) {
                    throw new BusinessException(ErrorCode.FIELD_VALUE_INVALID, "大小仅支持 A~L");
                }
            case RACE:
                try {
                    return CharacterRace.from(value).getLabel();
                } catch (Exception e) {
                    throw new BusinessException(ErrorCode.FIELD_VALUE_INVALID, "种族不在可选列表中");
                }
            case BIRTHDAY:
                if (!BIRTHDAY.matcher(value).matches()) {
                    throw new BusinessException(ErrorCode.FIELD_VALUE_INVALID, "生日格式应为 M-D 或 MM-DD，如 1-1");
                }
                String[] parts = value.split("-");
                int month = Integer.parseInt(parts[0]);
                int day = Integer.parseInt(parts[1]);
                return month + "-" + day;
            case RATING:
                try {
                    BigDecimal score = new BigDecimal(value);
                    if (score.compareTo(BigDecimal.ONE) < 0 || score.compareTo(new BigDecimal("5")) > 0) {
                        throw new BusinessException(ErrorCode.FIELD_VALUE_INVALID, "评分需在 1~5 之间");
                    }
                    // 保留 1 位小数，整数显示为 x.0
                    return score.setScale(1, RoundingMode.HALF_UP).toPlainString();
                } catch (BusinessException e) {
                    throw e;
                } catch (Exception e) {
                    throw new BusinessException(ErrorCode.FIELD_VALUE_INVALID, "评分必须为数字");
                }
            default:
                throw new BusinessException(ErrorCode.FIELD_VALUE_INVALID);
        }
    }

    private static String normalizePositiveNumber(String value, String label) {
        try {
            BigDecimal num = new BigDecimal(value);
            if (num.compareTo(BigDecimal.ZERO) <= 0 || num.compareTo(new BigDecimal("500")) > 0) {
                throw new BusinessException(ErrorCode.FIELD_VALUE_INVALID, label + "数值不合法");
            }
            return num.stripTrailingZeros().toPlainString();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.FIELD_VALUE_INVALID, label + "必须为数字");
        }
    }

    static String formatBirthdayDisplay(String valueText) {
        if (!StringUtils.hasText(valueText)) {
            return null;
        }
        String[] parts = valueText.split("-");
        if (parts.length != 2) {
            return valueText;
        }
        return Integer.parseInt(parts[0]) + "月" + Integer.parseInt(parts[1]) + "日";
    }
}
