package com.promilia.mail;

import com.promilia.common.api.ApiResponse;
import com.promilia.mail.model.MailMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/mail")
@RequiredArgsConstructor
public class MailController {

    private final MailService mailService;

    @GetMapping("/inbox")
    public ApiResponse<List<MailMessage>> inbox(@RequestParam(defaultValue = "10") int maxCount) {
        return ApiResponse.ok(mailService.receiveLatest(Math.min(Math.max(maxCount, 1), 50)));
    }
}
