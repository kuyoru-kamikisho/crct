package com.promilia.user;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import com.promilia.user.entity.EmailBan;
import com.promilia.user.mapper.EmailBanMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EmailBanService {

    private final EmailBanMapper emailBanMapper;

    /**
     * @return 有效禁用记录；已过期则清理并返回 null
     */
    public EmailBan findActiveBan(String email) {
        if (!StringUtils.hasText(email)) {
            return null;
        }
        EmailBan ban = emailBanMapper.selectOne(new LambdaQueryWrapper<EmailBan>()
                .eq(EmailBan::getEmail, email.trim().toLowerCase()));
        if (ban == null) {
            return null;
        }
        if (ban.getBanUntil() != null && !ban.getBanUntil().isAfter(LocalDateTime.now())) {
            emailBanMapper.deleteById(ban.getId());
            return null;
        }
        return ban;
    }

    public void assertNotBanned(String email) {
        EmailBan ban = findActiveBan(email);
        if (ban != null) {
            String tip = ban.getBanUntil() == null
                    ? "该邮箱已被永久禁用"
                    : "该邮箱已被禁用至 " + ban.getBanUntil();
            if (StringUtils.hasText(ban.getReason())) {
                tip = tip + "，原因：" + ban.getReason();
            }
            throw new BusinessException(ErrorCode.EMAIL_BANNED, tip);
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public EmailBan ban(String email, String reason, LocalDateTime banUntil) {
        if (!StringUtils.hasText(reason)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "禁用理由不能为空");
        }
        if (banUntil != null && !banUntil.isAfter(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "禁用截止时间必须晚于当前时间");
        }
        String normalized = email.trim().toLowerCase();
        EmailBan existing = emailBanMapper.selectOne(new LambdaQueryWrapper<EmailBan>()
                .eq(EmailBan::getEmail, normalized));
        LocalDateTime now = LocalDateTime.now();
        if (existing == null) {
            EmailBan ban = new EmailBan();
            ban.setEmail(normalized);
            ban.setReason(reason.trim());
            ban.setBanUntil(banUntil);
            ban.setCreatedAt(now);
            ban.setUpdatedAt(now);
            emailBanMapper.insert(ban);
            return ban;
        }
        existing.setReason(reason.trim());
        existing.setBanUntil(banUntil);
        existing.setUpdatedAt(now);
        emailBanMapper.updateById(existing);
        return existing;
    }

    @Transactional(rollbackFor = Exception.class)
    public void unban(String email) {
        emailBanMapper.delete(new LambdaQueryWrapper<EmailBan>()
                .eq(EmailBan::getEmail, email.trim().toLowerCase()));
    }
}
