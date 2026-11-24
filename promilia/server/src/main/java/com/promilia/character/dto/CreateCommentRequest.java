package com.promilia.character.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import java.util.List;

@Data
public class CreateCommentRequest {

    @NotBlank(message = "评价内容不能为空")
    @Size(max = 2000, message = "评价文字不能超过 2000 字")
    private String contentText;

    /** 已上传的图片 URL 列表（粘贴上传后传入），预留 stickers 扩展 */
    @Size(max = 20, message = "图片数量过多")
    private List<String> images;
}
