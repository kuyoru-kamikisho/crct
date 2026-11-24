CREATE TABLE IF NOT EXISTS t_user (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    email         VARCHAR(128)  NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    nickname      VARCHAR(64)   NOT NULL,
    avatar_url    VARCHAR(512)  NULL,
    signature     VARCHAR(50)   NULL,
    birthday      DATE          NULL,
    age           INT           NULL,
    gender        TINYINT       NOT NULL DEFAULT 0,
    role          TINYINT       NOT NULL DEFAULT 0 COMMENT '0普通用户 1管理员',
    ban_until     DATETIME      NULL COMMENT '冗余展示；权威以 t_email_ban 为准',
    ban_reason    VARCHAR(255)  NULL,
    login_ips     VARCHAR(1024) NULL COMMENT 'JSON数组，最新在前，最多10条',
    ip_location   VARCHAR(128)  NULL COMMENT '最新登录IP对应省/直辖市，社区展示用',
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted       TINYINT       NOT NULL DEFAULT 0,
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_nickname (nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 已有库增量列（重复执行时 Duplicate column 由 continueOnError 忽略）
ALTER TABLE t_user ADD COLUMN role TINYINT NOT NULL DEFAULT 0 COMMENT '0普通用户 1管理员' AFTER gender;
ALTER TABLE t_user ADD COLUMN ban_until DATETIME NULL AFTER role;
ALTER TABLE t_user ADD COLUMN ban_reason VARCHAR(255) NULL AFTER ban_until;
ALTER TABLE t_user ADD COLUMN login_ips VARCHAR(1024) NULL COMMENT 'JSON数组，最新在前，最多10条' AFTER ban_reason;

CREATE TABLE IF NOT EXISTS t_email_ban (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    email      VARCHAR(128)  NOT NULL,
    reason     VARCHAR(255)  NOT NULL,
    ban_until  DATETIME      NULL COMMENT 'NULL=永久禁用',
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ban_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 指定账号设为管理员（用户存在时生效）
UPDATE t_user SET role = 1 WHERE email = 'kuyoru730@gmail.com' AND deleted = 0;

-- 游戏角色（管理员维护基础信息）
CREATE TABLE IF NOT EXISTS t_game_character (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(64)   NOT NULL,
    gender      TINYINT       NOT NULL DEFAULT 0 COMMENT '0未知 1男 2女',
    image_url   VARCHAR(512)  NULL,
    created_by  BIGINT        NULL,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted     TINYINT       NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户对角色各字段的投稿（每用户每字段仅一次）
CREATE TABLE IF NOT EXISTS t_character_field_value (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    character_id  BIGINT        NOT NULL,
    user_id       BIGINT        NOT NULL,
    field_type    VARCHAR(32)   NOT NULL COMMENT 'HEIGHT/WEIGHT/MEASUREMENTS/CUP_SIZE/RACE/BIRTHDAY/RATING',
    value_text    VARCHAR(128)  NOT NULL,
    source        VARCHAR(512)  NOT NULL COMMENT '数据出处',
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_char_user_field (character_id, user_id, field_type),
    KEY idx_char_field (character_id, field_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 对字段投稿（数据出处）的打分
CREATE TABLE IF NOT EXISTS t_character_field_vote (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    field_value_id  BIGINT   NOT NULL,
    user_id         BIGINT   NOT NULL,
    score           TINYINT  NOT NULL COMMENT '1~5',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_field_vote (field_value_id, user_id),
    KEY idx_field_value (field_value_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 角色文字评价（可附带图片）
CREATE TABLE IF NOT EXISTS t_character_comment (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    character_id  BIGINT         NOT NULL,
    user_id       BIGINT         NOT NULL,
    content_text  VARCHAR(2000)  NOT NULL,
    images_json   VARCHAR(4000)  NULL COMMENT 'JSON 图片URL数组，预留 stickers',
    created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_char_comment (character_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
