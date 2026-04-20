package com.wiki.service;

import com.wiki.entity.User;
import java.util.List;

public interface UserService {
    List<User> findAll();
    User findById(Integer id);
    User findByUsername(String username);
    User findActiveByUsername(String username);
    User save(User user);
    User recordLoginSuccess(String username);
    User recordLoginFailure(String username);
    boolean canAccess(String username);
    String getAccessBlockReason(User user);
    void deleteById(Integer id);
}