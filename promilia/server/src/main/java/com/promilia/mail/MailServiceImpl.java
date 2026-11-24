package com.promilia.mail;

import com.promilia.common.config.PromiliaProperties;
import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import com.promilia.mail.model.MailMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.mail.FetchProfile;
import javax.mail.Folder;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Store;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Properties;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailServiceImpl implements MailService {

    private final JavaMailSender mailSender;
    private final PromiliaProperties properties;

    @Override
    public void sendText(String to, String subject, String content) {
        if (isMock()) {
            logMock("text", to, subject, content);
            return;
        }
        executeWithRetry(() -> {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(properties.getMail().getFrom());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(content);
            mailSender.send(message);
        }, "text", to, subject);
    }

    @Override
    public void sendHtml(String to, String subject, String htmlContent) {
        if (isMock()) {
            logMock("html", to, subject, htmlContent);
            return;
        }
        executeWithRetry(() -> {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(properties.getMail().getFrom());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
        }, "html", to, subject);
    }

    private boolean isMock() {
        return properties.getMail().isMock();
    }

    private void logMock(String type, String to, String subject, String content) {
        log.info("[MAIL-MOCK] type={} to={} subject={} content={}", type, to, subject, content);
    }

    @Override
    public void sendVerifyCodeMail(String to, String code) {
        String html = "<div style=\"font-family:Arial,sans-serif;padding:16px\">"
                + "<h2>邮箱验证码</h2>"
                + "<p>您的验证码为：</p>"
                + "<p style=\"font-size:24px;font-weight:bold;letter-spacing:4px;color:#1a73e8\">"
                + code + "</p>"
                + "<p>有效期 5 分钟，请勿泄露给他人。</p>"
                + "</div>";
        sendHtml(to, "【Promilia】邮箱验证码", html);
    }

    @Override
    public void sendResetPasswordMail(String to, String resetLink) {
        String html = "<div style=\"font-family:Arial,sans-serif;padding:16px\">"
                + "<h2>重置密码</h2>"
                + "<p>请点击以下链接重置密码（15 分钟内有效，仅可使用一次）：</p>"
                + "<p><a href=\"" + resetLink + "\">" + resetLink + "</a></p>"
                + "<p>如非本人操作，请忽略本邮件。</p>"
                + "</div>";
        sendHtml(to, "【Promilia】重置密码", html);
    }

    @Override
    public List<MailMessage> receiveLatest(int maxCount) {
        PromiliaProperties.Imap imap = properties.getMail().getImap();
        if (!StringUtils.hasText(imap.getHost()) || !StringUtils.hasText(imap.getUsername())) {
            throw new BusinessException(ErrorCode.MAIL_RECEIVE_FAILED, "IMAP 配置不完整");
        }
        Properties props = new Properties();
        String protocol = imap.isSsl() ? "imaps" : "imap";
        props.put("mail.store.protocol", protocol);
        props.put("mail." + protocol + ".host", imap.getHost());
        props.put("mail." + protocol + ".port", String.valueOf(imap.getPort()));
        if (imap.isSsl()) {
            props.put("mail.imaps.ssl.enable", "true");
        }

        Store store = null;
        Folder inbox = null;
        try {
            Session session = Session.getInstance(props);
            store = session.getStore(protocol);
            store.connect(imap.getHost(), imap.getUsername(), imap.getPassword());
            inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_ONLY);
            int total = inbox.getMessageCount();
            if (total <= 0) {
                return Collections.emptyList();
            }
            int start = Math.max(1, total - maxCount + 1);
            Message[] messages = inbox.getMessages(start, total);
            FetchProfile fp = new FetchProfile();
            fp.add(FetchProfile.Item.ENVELOPE);
            fp.add(FetchProfile.Item.CONTENT_INFO);
            inbox.fetch(messages, fp);

            List<MailMessage> result = new ArrayList<MailMessage>();
            for (int i = messages.length - 1; i >= 0; i--) {
                Message message = messages[i];
                result.add(MailMessage.builder()
                        .from(addressesToString(message.getFrom()))
                        .to(Collections.singletonList(addressesToString(message.getRecipients(Message.RecipientType.TO))))
                        .subject(message.getSubject())
                        .textContent(extractText(message))
                        .sentDate(message.getSentDate())
                        .build());
            }
            return result;
        } catch (Exception e) {
            log.error("邮件接收失败", e);
            throw new BusinessException(ErrorCode.MAIL_RECEIVE_FAILED);
        } finally {
            try {
                if (inbox != null && inbox.isOpen()) {
                    inbox.close(false);
                }
                if (store != null) {
                    store.close();
                }
            } catch (MessagingException e) {
                log.warn("关闭邮箱连接失败", e);
            }
        }
    }

    private void executeWithRetry(MailAction action, String type, String to, String subject) {
        int retryTimes = Math.max(1, properties.getMail().getRetryTimes());
        long interval = Math.max(0, properties.getMail().getRetryIntervalMs());
        Exception last = null;
        for (int i = 1; i <= retryTimes; i++) {
            try {
                action.run();
                log.info("邮件发送成功 type={} to={} subject={} attempt={}", type, to, subject, i);
                return;
            } catch (MailException | MessagingException e) {
                last = e;
                log.warn("邮件发送失败 type={} to={} subject={} attempt={}/{}", type, to, subject, i, retryTimes, e);
                if (i < retryTimes && interval > 0) {
                    try {
                        Thread.sleep(interval);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            } catch (Exception e) {
                last = e;
                log.error("邮件发送异常 type={} to={} subject={}", type, to, subject, e);
                break;
            }
        }
        log.error("邮件最终发送失败 type={} to={} subject={}", type, to, subject, last);
        throw new BusinessException(ErrorCode.MAIL_SEND_FAILED);
    }

    private String addressesToString(javax.mail.Address[] addresses) {
        if (addresses == null || addresses.length == 0) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (javax.mail.Address address : addresses) {
            if (sb.length() > 0) {
                sb.append(",");
            }
            if (address instanceof InternetAddress) {
                sb.append(((InternetAddress) address).getAddress());
            } else {
                sb.append(address.toString());
            }
        }
        return sb.toString();
    }

    private String extractText(Message message) throws Exception {
        Object content = message.getContent();
        if (content instanceof String) {
            return (String) content;
        }
        if (content instanceof MimeMultipart) {
            MimeMultipart multipart = (MimeMultipart) content;
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < multipart.getCount(); i++) {
                Object part = multipart.getBodyPart(i).getContent();
                if (part instanceof String) {
                    sb.append(part);
                }
            }
            return sb.toString();
        }
        return "";
    }

    @FunctionalInterface
    private interface MailAction {
        void run() throws Exception;
    }
}
