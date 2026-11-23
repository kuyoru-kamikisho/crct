package com.promilia.mail.model;

import lombok.Builder;
import lombok.Data;

import java.util.Date;
import java.util.List;

@Data
@Builder
public class MailMessage {
    private String from;
    private List<String> to;
    private String subject;
    private String textContent;
    private String htmlContent;
    private Date sentDate;
}
