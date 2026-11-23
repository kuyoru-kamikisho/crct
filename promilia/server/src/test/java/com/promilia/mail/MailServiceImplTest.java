package com.promilia.mail;

import com.promilia.common.config.PromiliaProperties;
import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import javax.mail.Session;
import javax.mail.internet.MimeMessage;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MailServiceImplTest {

    @Mock
    private JavaMailSender mailSender;

    private MailServiceImpl mailService;

    @BeforeEach
    void setUp() {
        PromiliaProperties properties = new PromiliaProperties();
        properties.getMail().setFrom("noreply@test.com");
        properties.getMail().setRetryTimes(3);
        properties.getMail().setRetryIntervalMs(1);
        mailService = new MailServiceImpl(mailSender, properties);
    }

    @Test
    void sendText_success() {
        mailService.sendText("a@b.com", "subject", "hello");
        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendHtml_success() throws Exception {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        mailService.sendHtml("a@b.com", "subject", "<b>hi</b>");
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void sendVerifyCodeMail_success() throws Exception {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        mailService.sendVerifyCodeMail("a@b.com", "AB12CD");
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void sendText_retryThenFail() {
        doThrow(new MailSendException("down")).when(mailSender).send(any(SimpleMailMessage.class));
        BusinessException ex = assertThrows(BusinessException.class,
                () -> mailService.sendText("a@b.com", "s", "c"));
        assertEquals(ErrorCode.MAIL_SEND_FAILED.getCode(), ex.getCode());
        verify(mailSender, times(3)).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendResetPasswordMail_success() throws Exception {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        mailService.sendResetPasswordMail("a@b.com", "http://x/reset?token=1");
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }
}
