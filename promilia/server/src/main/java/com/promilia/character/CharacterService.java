package com.promilia.character;

import com.promilia.character.dto.CharacterDetailResponse;
import com.promilia.character.dto.CharacterListItem;
import com.promilia.character.dto.CommentView;
import com.promilia.character.dto.CreateCharacterRequest;
import com.promilia.character.dto.CreateCommentRequest;
import com.promilia.character.dto.FieldValueView;
import com.promilia.character.dto.SubmitFieldRequest;
import com.promilia.character.dto.VoteFieldRequest;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface CharacterService {

    List<CharacterListItem> list(Long viewerId, boolean viewerIsAdmin);

    CharacterDetailResponse detail(Long characterId, Long viewerId);

    Long create(Long adminId, CreateCharacterRequest request, MultipartFile image);

    void delete(Long adminId, Long characterId);

    FieldValueView submitField(Long userId, Long characterId, SubmitFieldRequest request);

    FieldValueView voteField(Long userId, Long fieldValueId, VoteFieldRequest request);

    CommentView addComment(Long userId, Long characterId, CreateCommentRequest request);

    String uploadCommentImage(Long userId, MultipartFile file);

    Map<String, Object> meta();
}
