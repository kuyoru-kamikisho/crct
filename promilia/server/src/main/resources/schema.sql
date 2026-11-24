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
