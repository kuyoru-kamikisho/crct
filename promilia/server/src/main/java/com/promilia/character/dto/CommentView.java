package com.promilia.character.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CommentView {
    private Long id;
    private Long userId;
    private String nickname;
    private String avatarUrl;
    private String contentText;
    private List<String> images;
    private LocalDateTime createdAt;
}
