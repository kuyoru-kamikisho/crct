package com.promilia.character;

import com.promilia.character.dto.CharacterDetailResponse;
import com.promilia.character.dto.CharacterListItem;
import com.promilia.character.dto.CommentView;
import com.promilia.character.dto.CreateCommentRequest;
import com.promilia.character.dto.FieldValueView;
import com.promilia.character.dto.SubmitFieldRequest;
import com.promilia.character.dto.VoteFieldRequest;
import com.promilia.common.api.ApiResponse;
import com.promilia.common.security.UserContext;
import com.promilia.user.entity.User;
import com.promilia.user.enums.UserRole;
import com.promilia.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/characters")
@RequiredArgsConstructor
public class CharacterController {

    private final CharacterService characterService;
    private final UserMapper userMapper;

    @GetMapping("/meta")
    public ApiResponse<Map<String, Object>> meta() {
        return ApiResponse.ok(characterService.meta());
    }

    @GetMapping
    public ApiResponse<List<CharacterListItem>> list() {
        Long userId = UserContext.getUserId();
        boolean admin = isAdmin(userId);
        return ApiResponse.ok(characterService.list(userId, admin));
    }

    @GetMapping("/{id}")
    public ApiResponse<CharacterDetailResponse> detail(@PathVariable("id") Long id) {
        return ApiResponse.ok(characterService.detail(id, UserContext.getUserId()));
    }

    @PostMapping("/{id}/fields")
    public ApiResponse<FieldValueView> submitField(@PathVariable("id") Long id,
                                                   @Validated @RequestBody SubmitFieldRequest request) {
        return ApiResponse.ok(characterService.submitField(UserContext.getUserId(), id, request));
    }

    @PostMapping("/fields/{fieldValueId}/vote")
    public ApiResponse<FieldValueView> vote(@PathVariable("fieldValueId") Long fieldValueId,
                                            @Validated @RequestBody VoteFieldRequest request) {
        return ApiResponse.ok(characterService.voteField(UserContext.getUserId(), fieldValueId, request));
    }

    @PostMapping("/{id}/comments")
    public ApiResponse<CommentView> comment(@PathVariable("id") Long id,
                                            @Validated @RequestBody CreateCommentRequest request) {
        return ApiResponse.ok(characterService.addComment(UserContext.getUserId(), id, request));
    }

    @PostMapping("/comment-images")
    public ApiResponse<Map<String, String>> uploadCommentImage(@RequestParam("file") MultipartFile file) {
        String url = characterService.uploadCommentImage(UserContext.getUserId(), file);
        return ApiResponse.ok(Collections.singletonMap("url", url));
    }

    private boolean isAdmin(Long userId) {
        if (userId == null) {
            return false;
        }
        User user = userMapper.selectById(userId);
        return user != null && user.getRole() == UserRole.ADMIN;
    }
}
