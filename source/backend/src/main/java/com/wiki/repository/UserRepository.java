package com.wiki.repository;

import com.wiki.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Integer> {
    User findByUsername(String username);
    User findByUsernameAndDeletedAtIsNull(String username);
}