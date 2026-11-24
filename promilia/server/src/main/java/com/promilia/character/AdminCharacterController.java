package com.promilia.character;

import com.promilia.character.dto.CreateCharacterRequest;
import com.promilia.common.api.ApiResponse;
import com.promilia.common.security.UserContext;
import com.promilia.user.enums.Gender;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/characters")
@RequiredArgsConstructor
public class AdminCharacterController {

    private final CharacterService characterService;

    @PostMapping
    public ApiResponse<Map<String, Long>> create(
            @RequestParam("name") String name,
            @RequestParam("gender") Integer gender,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        CreateCharacterRequest request = new CreateCharacterRequest();
        request.setName(name);
        request.setGender(Gender.fromCode(gender));
        Long id = characterService.create(UserContext.getUserId(), request, image);
        return ApiResponse.ok(Collections.singletonMap("id", id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") Long id) {
        characterService.delete(UserContext.getUserId(), id);
        return ApiResponse.ok();
    }
}
