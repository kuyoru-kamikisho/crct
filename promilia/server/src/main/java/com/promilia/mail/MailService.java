package com.promilia.mail;

import com.promilia.mail.model.MailMessage;

import java.util.List;

public interface MailService {

    void sendText(String to, String subject, String content);

    void sendHtml(String to, String subject, String htmlContent);

    void sendVerifyCodeMail(String to, String code);

    void sendResetPasswordMail(String to, String resetLink);

    List<MailMessage> receiveLatest(int maxCount);
}
