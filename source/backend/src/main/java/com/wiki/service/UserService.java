package com.wiki.service;

import com.wiki.entity.User;
import java.util.List;

public interface UserService {
    List<User> findAll();
    User findById(Integer id);
    User findByUsername(String username);
    User save(User user);
    void deleteById(Integer id);
}