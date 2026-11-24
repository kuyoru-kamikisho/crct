package com.promilia.character;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.promilia.character.dto.CharacterDetailResponse;
import com.promilia.character.dto.CharacterListItem;
import com.promilia.character.dto.CommentView;
import com.promilia.character.dto.CreateCharacterRequest;
import com.promilia.character.dto.CreateCommentRequest;
import com.promilia.character.dto.FieldValueView;
import com.promilia.character.dto.SubmitFieldRequest;
import com.promilia.character.dto.VoteFieldRequest;
import com.promilia.character.entity.CharacterComment;
import com.promilia.character.entity.CharacterFieldValue;
import com.promilia.character.entity.CharacterFieldVote;
import com.promilia.character.entity.GameCharacter;
import com.promilia.character.enums.CharacterFieldType;
import com.promilia.character.enums.CharacterRace;
import com.promilia.character.enums.CupSize;
import com.promilia.character.mapper.CharacterCommentMapper;
import com.promilia.character.mapper.CharacterFieldValueMapper;
import com.promilia.character.mapper.CharacterFieldVoteMapper;
import com.promilia.character.mapper.GameCharacterMapper;
import com.promilia.common.config.PromiliaProperties;
import com.promilia.common.exception.BusinessException;
import com.promilia.common.exception.ErrorCode;
import com.promilia.common.redis.RedisKeys;
import com.promilia.user.entity.User;
import com.promilia.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CharacterServiceImpl implements CharacterService {

    private static final Set<String> IMAGE_EXT = new HashSet<String>(Arrays.asList("jpg", "jpeg", "png", "webp", "gif"));
    private static final long MAX_IMAGE_SIZE = 2L * 1024 * 1024;
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<List<String>>() {
    };

    private final GameCharacterMapper characterMapper;
    private final CharacterFieldValueMapper fieldValueMapper;
    private final CharacterFieldVoteMapper fieldVoteMapper;
    private final CharacterCommentMapper commentMapper;
    private final UserMapper userMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final PromiliaProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public List<CharacterListItem> list(Long viewerId, boolean viewerIsAdmin) {
        List<GameCharacter> characters = characterMapper.selectList(
                new LambdaQueryWrapper<GameCharacter>().orderByDesc(GameCharacter::getId));
        if (characters.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> ids = characters.stream().map(GameCharacter::getId).collect(Collectors.toList());
        List<CharacterFieldValue> allValues = fieldValueMapper.selectList(
                new LambdaQueryWrapper<CharacterFieldValue>().in(CharacterFieldValue::getCharacterId, ids));
        Map<Long, List<CharacterFieldValue>> byChar = allValues.stream()
                .collect(Collectors.groupingBy(CharacterFieldValue::getCharacterId));
        Map<Long, VoteAgg> voteMap = loadVoteAgg(allValues);

        List<CharacterListItem> result = new ArrayList<CharacterListItem>();
        for (GameCharacter c : characters) {
            Map<CharacterFieldType, String> winners = pickWinners(byChar.get(c.getId()), voteMap);
            String birthday = winners.get(CharacterFieldType.BIRTHDAY);
            result.add(CharacterListItem.builder()
                    .id(c.getId())
                    .name(c.getName())
                    .gender(c.getGender())
                    .imageUrl(c.getImageUrl())
                    .height(formatHeight(winners.get(CharacterFieldType.HEIGHT)))
                    .weight(formatWeight(winners.get(CharacterFieldType.WEIGHT)))
                    .measurements(winners.get(CharacterFieldType.MEASUREMENTS))
                    .cupSize(winners.get(CharacterFieldType.CUP_SIZE))
                    .race(winners.get(CharacterFieldType.RACE))
                    .birthday(birthday)
                    .birthdayDisplay(CharacterFieldValidator.formatBirthdayDisplay(birthday))
                    .rating(winners.get(CharacterFieldType.RATING))
                    .canDelete(viewerIsAdmin)
                    .build());
        }
        return result;
    }

    @Override
    public CharacterDetailResponse detail(Long characterId, Long viewerId) {
        GameCharacter c = requireCharacter(characterId);
        List<CharacterFieldValue> values = fieldValueMapper.selectList(
                new LambdaQueryWrapper<CharacterFieldValue>()
                        .eq(CharacterFieldValue::getCharacterId, characterId)
                        .orderByDesc(CharacterFieldValue::getId));
        Map<Long, VoteAgg> voteMap = loadVoteAgg(values);
        Map<Long, Integer> myVotes = loadMyVotes(values, viewerId);
        Map<Long, User> users = loadUsers(values.stream().map(CharacterFieldValue::getUserId).collect(Collectors.toSet()));

        Map<String, List<FieldValueView>> grouped = new LinkedHashMap<String, List<FieldValueView>>();
        for (CharacterFieldType type : CharacterFieldType.values()) {
            grouped.put(type.getCode(), new ArrayList<FieldValueView>());
        }
        List<String> mySubmitted = new ArrayList<String>();
        for (CharacterFieldValue v : values) {
            if (viewerId != null && viewerId.equals(v.getUserId())) {
                mySubmitted.add(v.getFieldType().getCode());
            }
            VoteAgg agg = voteMap.getOrDefault(v.getId(), VoteAgg.EMPTY);
            User u = users.get(v.getUserId());
            FieldValueView view = FieldValueView.builder()
                    .id(v.getId())
                    .fieldType(v.getFieldType())
                    .valueText(v.getValueText())
                    .displayValue(displayValue(v.getFieldType(), v.getValueText()))
                    .source(v.getSource())
                    .userId(v.getUserId())
                    .nickname(u == null ? ("用户" + v.getUserId()) : u.getNickname())
                    .avgScore(agg.avg)
                    .voteCount(agg.count)
                    .myVote(myVotes.get(v.getId()))
                    .createdAt(v.getCreatedAt())
                    .build();
            grouped.get(v.getFieldType().getCode()).add(view);
        }
        for (List<FieldValueView> list : grouped.values()) {
            list.sort(Comparator
                    .comparingDouble(FieldValueView::getAvgScore).reversed()
                    .thenComparing(FieldValueView::getVoteCount, Comparator.reverseOrder())
                    .thenComparing(FieldValueView::getId, Comparator.reverseOrder()));
        }

        List<CharacterComment> comments = commentMapper.selectList(
                new LambdaQueryWrapper<CharacterComment>()
                        .eq(CharacterComment::getCharacterId, characterId)
                        .orderByDesc(CharacterComment::getId));
        Set<Long> commentUserIds = comments.stream().map(CharacterComment::getUserId).collect(Collectors.toSet());
        Map<Long, User> commentUsers = loadUsers(commentUserIds);
        List<CommentView> commentViews = new ArrayList<CommentView>();
        for (CharacterComment comment : comments) {
            User u = commentUsers.get(comment.getUserId());
            commentViews.add(CommentView.builder()
                    .id(comment.getId())
                    .userId(comment.getUserId())
                    .nickname(u == null ? ("用户" + comment.getUserId()) : u.getNickname())
                    .avatarUrl(u == null ? null : u.getAvatarUrl())
                    .contentText(comment.getContentText())
                    .images(parseImages(comment.getImagesJson()))
                    .createdAt(comment.getCreatedAt())
                    .build());
        }

        return CharacterDetailResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .gender(c.getGender())
                .imageUrl(c.getImageUrl())
                .fieldValues(grouped)
                .mySubmittedFields(mySubmitted)
                .comments(commentViews)
                .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long create(Long adminId, CreateCharacterRequest request, MultipartFile image) {
        GameCharacter c = new GameCharacter();
        c.setName(request.getName().trim());
        c.setGender(request.getGender());
        c.setCreatedBy(adminId);
        c.setCreatedAt(LocalDateTime.now());
        c.setUpdatedAt(LocalDateTime.now());
        c.setDeleted(0);
        if (image != null && !image.isEmpty()) {
            c.setImageUrl(saveImage(image, properties.getUpload().getCharacterImageDir(), "/characters/"));
        }
        characterMapper.insert(c);
        return c.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long adminId, Long characterId) {
        requireCharacter(characterId);
        characterMapper.deleteById(characterId);
        log.info("删除角色 adminId={} characterId={}", adminId, characterId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FieldValueView submitField(Long userId, Long characterId, SubmitFieldRequest request) {
        requireCharacter(characterId);
        CharacterFieldType type = request.getFieldType();
        Long exists = fieldValueMapper.selectCount(new LambdaQueryWrapper<CharacterFieldValue>()
                .eq(CharacterFieldValue::getCharacterId, characterId)
                .eq(CharacterFieldValue::getUserId, userId)
                .eq(CharacterFieldValue::getFieldType, type));
        if (exists != null && exists > 0) {
            throw new BusinessException(ErrorCode.FIELD_ALREADY_SUBMITTED);
        }
        if (!StringUtils.hasText(request.getSource())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "数据出处不能为空");
        }
        String normalized = CharacterFieldValidator.normalize(type, request.getValue());
        CharacterFieldValue entity = new CharacterFieldValue();
        entity.setCharacterId(characterId);
        entity.setUserId(userId);
        entity.setFieldType(type);
        entity.setValueText(normalized);
        entity.setSource(request.getSource().trim());
        entity.setCreatedAt(LocalDateTime.now());
        fieldValueMapper.insert(entity);

        User u = userMapper.selectById(userId);
        return FieldValueView.builder()
                .id(entity.getId())
                .fieldType(type)
                .valueText(normalized)
                .displayValue(displayValue(type, normalized))
                .source(entity.getSource())
                .userId(userId)
                .nickname(u == null ? null : u.getNickname())
                .avgScore(0)
                .voteCount(0)
                .myVote(null)
                .createdAt(entity.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FieldValueView voteField(Long userId, Long fieldValueId, VoteFieldRequest request) {
        CharacterFieldValue value = fieldValueMapper.selectById(fieldValueId);
        if (value == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "数据投稿不存在");
        }
        Long exists = fieldVoteMapper.selectCount(new LambdaQueryWrapper<CharacterFieldVote>()
                .eq(CharacterFieldVote::getFieldValueId, fieldValueId)
                .eq(CharacterFieldVote::getUserId, userId));
        if (exists != null && exists > 0) {
            throw new BusinessException(ErrorCode.FIELD_VOTE_EXISTS);
        }
        CharacterFieldVote vote = new CharacterFieldVote();
        vote.setFieldValueId(fieldValueId);
        vote.setUserId(userId);
        vote.setScore(request.getScore());
        vote.setCreatedAt(LocalDateTime.now());
        fieldVoteMapper.insert(vote);

        VoteAgg agg = loadVoteAgg(Collections.singletonList(value)).getOrDefault(fieldValueId, VoteAgg.EMPTY);
        User u = userMapper.selectById(value.getUserId());
        return FieldValueView.builder()
                .id(value.getId())
                .fieldType(value.getFieldType())
                .valueText(value.getValueText())
                .displayValue(displayValue(value.getFieldType(), value.getValueText()))
                .source(value.getSource())
                .userId(value.getUserId())
                .nickname(u == null ? null : u.getNickname())
                .avgScore(agg.avg)
                .voteCount(agg.count)
                .myVote(request.getScore())
                .createdAt(value.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommentView addComment(Long userId, Long characterId, CreateCommentRequest request) {
        requireCharacter(characterId);
        String text = request.getContentText() == null ? "" : request.getContentText().trim();
        if (!StringUtils.hasText(text)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "评价内容不能为空");
        }
        if (text.codePointCount(0, text.length()) > 2000) {
            throw new BusinessException(ErrorCode.COMMENT_TOO_LONG);
        }
        String lockKey = RedisKeys.characterCommentLock(userId);
        Boolean locked = stringRedisTemplate.opsForValue().setIfAbsent(
                lockKey, "1",
                properties.getCharacterEval().getCommentIntervalSeconds(),
                TimeUnit.SECONDS);
        if (Boolean.FALSE.equals(locked)) {
            throw new BusinessException(ErrorCode.COMMENT_TOO_FAST);
        }

        List<String> images = request.getImages() == null ? Collections.<String>emptyList() : request.getImages();
        if (images.size() > 20) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "图片数量过多");
        }
        CharacterComment comment = new CharacterComment();
        comment.setCharacterId(characterId);
        comment.setUserId(userId);
        comment.setContentText(text);
        comment.setImagesJson(toImagesJson(images));
        comment.setCreatedAt(LocalDateTime.now());
        commentMapper.insert(comment);

        User u = userMapper.selectById(userId);
        return CommentView.builder()
                .id(comment.getId())
                .userId(userId)
                .nickname(u == null ? null : u.getNickname())
                .avatarUrl(u == null ? null : u.getAvatarUrl())
                .contentText(text)
                .images(images)
                .createdAt(comment.getCreatedAt())
                .build();
    }

    @Override
    public String uploadCommentImage(Long userId, MultipartFile file) {
        return saveImage(file, properties.getUpload().getCommentImageDir(), "/comment-images/");
    }

    @Override
    public Map<String, Object> meta() {
        Map<String, Object> map = new HashMap<String, Object>();
        List<String> cups = new ArrayList<String>();
        for (CupSize c : CupSize.values()) {
            cups.add(c.name());
        }
        List<String> races = new ArrayList<String>();
        for (CharacterRace r : CharacterRace.values()) {
            races.add(r.getLabel());
        }
        map.put("cupSizes", cups);
        map.put("races", races);
        map.put("fieldTypes", CharacterFieldType.values());
        map.put("commentIntervalSeconds", properties.getCharacterEval().getCommentIntervalSeconds());
        return map;
    }

    private GameCharacter requireCharacter(Long id) {
        GameCharacter c = characterMapper.selectById(id);
        if (c == null) {
            throw new BusinessException(ErrorCode.CHARACTER_NOT_FOUND);
        }
        return c;
    }

    private Map<CharacterFieldType, String> pickWinners(List<CharacterFieldValue> values, Map<Long, VoteAgg> voteMap) {
        Map<CharacterFieldType, String> winners = new HashMap<CharacterFieldType, String>();
        if (values == null || values.isEmpty()) {
            return winners;
        }
        Map<CharacterFieldType, List<CharacterFieldValue>> grouped = values.stream()
                .collect(Collectors.groupingBy(CharacterFieldValue::getFieldType));
        for (Map.Entry<CharacterFieldType, List<CharacterFieldValue>> e : grouped.entrySet()) {
            CharacterFieldValue best = e.getValue().stream()
                    .max(Comparator
                            .comparingDouble((CharacterFieldValue v) -> voteMap.getOrDefault(v.getId(), VoteAgg.EMPTY).avg)
                            .thenComparingInt(v -> voteMap.getOrDefault(v.getId(), VoteAgg.EMPTY).count)
                            .thenComparing(CharacterFieldValue::getId))
                    .orElse(null);
            if (best != null) {
                winners.put(e.getKey(), best.getValueText());
            }
        }
        return winners;
    }

    private Map<Long, VoteAgg> loadVoteAgg(List<CharacterFieldValue> values) {
        Map<Long, VoteAgg> map = new HashMap<Long, VoteAgg>();
        if (values == null || values.isEmpty()) {
            return map;
        }
        List<Long> ids = values.stream().map(CharacterFieldValue::getId).collect(Collectors.toList());
        List<CharacterFieldVote> votes = fieldVoteMapper.selectList(
                new LambdaQueryWrapper<CharacterFieldVote>().in(CharacterFieldVote::getFieldValueId, ids));
        Map<Long, List<CharacterFieldVote>> byValue = votes.stream()
                .collect(Collectors.groupingBy(CharacterFieldVote::getFieldValueId));
        for (Long id : ids) {
            List<CharacterFieldVote> list = byValue.get(id);
            if (list == null || list.isEmpty()) {
                map.put(id, VoteAgg.EMPTY);
                continue;
            }
            double sum = 0;
            for (CharacterFieldVote v : list) {
                sum += v.getScore();
            }
            map.put(id, new VoteAgg(sum / list.size(), list.size()));
        }
        return map;
    }

    private Map<Long, Integer> loadMyVotes(List<CharacterFieldValue> values, Long viewerId) {
        Map<Long, Integer> map = new HashMap<Long, Integer>();
        if (viewerId == null || values == null || values.isEmpty()) {
            return map;
        }
        List<Long> ids = values.stream().map(CharacterFieldValue::getId).collect(Collectors.toList());
        List<CharacterFieldVote> votes = fieldVoteMapper.selectList(
                new LambdaQueryWrapper<CharacterFieldVote>()
                        .eq(CharacterFieldVote::getUserId, viewerId)
                        .in(CharacterFieldVote::getFieldValueId, ids));
        for (CharacterFieldVote v : votes) {
            map.put(v.getFieldValueId(), v.getScore());
        }
        return map;
    }

    private Map<Long, User> loadUsers(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyMap();
        }
        List<User> users = userMapper.selectList(new LambdaQueryWrapper<User>().in(User::getId, ids));
        Map<Long, User> map = new HashMap<Long, User>();
        for (User u : users) {
            map.put(u.getId(), u);
        }
        return map;
    }

    private String displayValue(CharacterFieldType type, String valueText) {
        if (type == CharacterFieldType.BIRTHDAY) {
            return CharacterFieldValidator.formatBirthdayDisplay(valueText);
        }
        if (type == CharacterFieldType.HEIGHT) {
            return formatHeight(valueText);
        }
        if (type == CharacterFieldType.WEIGHT) {
            return formatWeight(valueText);
        }
        return valueText;
    }

    private String formatHeight(String v) {
        return StringUtils.hasText(v) ? v + "cm" : null;
    }

    private String formatWeight(String v) {
        return StringUtils.hasText(v) ? v + "kg" : null;
    }

    private List<String> parseImages(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyList();
        }
        try {
            List<String> list = objectMapper.readValue(json, STRING_LIST);
            return list == null ? Collections.<String>emptyList() : list;
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String toImagesJson(List<String> images) {
        try {
            return objectMapper.writeValueAsString(images == null ? Collections.emptyList() : images);
        } catch (Exception e) {
            return "[]";
        }
    }

    private String saveImage(MultipartFile file, String dirConfig, String urlPrefix) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.AVATAR_INVALID, "请上传图片");
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BusinessException(ErrorCode.AVATAR_INVALID, "图片不能超过 2MB");
        }
        String ext = FilenameUtils.getExtension(file.getOriginalFilename() == null ? "" : file.getOriginalFilename())
                .toLowerCase();
        if (!IMAGE_EXT.contains(ext)) {
            throw new BusinessException(ErrorCode.AVATAR_INVALID, "仅允许 jpg/png/webp/gif");
        }
        try {
            Path dir = Paths.get(dirConfig).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String filename = UUID.randomUUID().toString().replace("-", "") + "." + ext;
            file.transferTo(dir.resolve(filename).toFile());
            return urlPrefix + filename;
        } catch (IOException e) {
            log.error("图片保存失败", e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "图片保存失败");
        }
    }

    private static final class VoteAgg {
        static final VoteAgg EMPTY = new VoteAgg(0, 0);
        final double avg;
        final int count;

        VoteAgg(double avg, int count) {
            this.avg = avg;
            this.count = count;
        }
    }
}
