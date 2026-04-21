package com.wiki.service;

import com.wiki.entity.User;
import java.util.List;
import java.util.Map;

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
    boolean isUsernameAvailable(String username);
    Map<String, Object> register(String username, String password, String recoveryKey, String ipAddress, String birthday, Byte gender);
    Map<String, Object> login(String username, String password, String ipAddress);
    Map<String, Object> resetPassword(String username, Integer userId, String recoveryKey, String newPassword, String newRecoveryKey);
    User findByUserIdForRetrieve(Integer userId);
    void deleteById(Integer id);
}