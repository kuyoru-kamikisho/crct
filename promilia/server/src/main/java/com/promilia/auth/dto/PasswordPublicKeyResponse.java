package com.promilia.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordPublicKeyResponse {

    /** Base64 编码的 X.509 SubjectPublicKeyInfo，算法 RSA-OAEP SHA-256 */
    private String publicKey;

    /** 固定标识，便于前端校验 */
    private String algorithm;
}
