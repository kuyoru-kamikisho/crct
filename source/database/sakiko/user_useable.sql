-- sakiko.user_useable definition

CREATE TABLE `user_useable` (
                                `id` int NOT NULL AUTO_INCREMENT COMMENT '用户id',
                                `username` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '用户名称',
                                `pwd` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '12345678' COMMENT '用户密码',
                                `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '用户ip访问地址',
                                `user_type` tinyint NOT NULL DEFAULT '2' COMMENT '0:系统管理员,1:普通管理员,2:普通用户,3:已禁止访问的用户',
                                `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建日期',
                                `deleted_at` datetime DEFAULT NULL COMMENT '注销日期',
                                `birthday` date DEFAULT NULL COMMENT '生日',
                                `bio` varchar(300) DEFAULT NULL COMMENT '个人简介',
                                `gender` tinyint DEFAULT '2' COMMENT '性别：0女,1男,2未知',
                                `last_login_time` datetime DEFAULT NULL COMMENT '上一次登录时间',
                                `position` varchar(60) DEFAULT NULL COMMENT '职位',
                                `marked` tinyint(1) NOT NULL DEFAULT '0' COMMENT '被标记的，通常是有违规记录且处于惩罚期的用户',
                                `mark_time` datetime DEFAULT NULL COMMENT '被标记时间',
                                `mark_reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '标记原因',
                                PRIMARY KEY (`id`),
                                UNIQUE KEY `idx_username_unique` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=100001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Main User Table, which is typically available, but can also be blacklisted under certain circumstances';