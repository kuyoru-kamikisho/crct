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
    ip_location   VARCHAR(128)  NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted       TINYINT       NOT NULL DEFAULT 0,
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_nickname (nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
