package com.wiki.controller;

import com.wiki.entity.User;
import com.wiki.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin
public class UserController {

    @Autowired
    private UserService userService;

    // 获取所有用户
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.findAll();
        return ResponseEntity.ok(users);
    }

    // 根据ID获取用户
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Integer id) {
        User user = userService.findById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(user);
    }

    // 创建用户
    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        user.setId(null);
        if (user.getDeletedAt() != null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            User savedUser = userService.save(user);
            return ResponseEntity.ok(savedUser);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 更新用户
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Integer id, @RequestBody User user) {
        User existingUser = userService.findById(id);
        if (existingUser == null) {
            return ResponseEntity.notFound().build();
        }
        user.setId(id);
        if (user.getPasswordHash() == null) {
            user.setPasswordHash(existingUser.getPasswordHash());
        }
        if (user.getRecoveryKey() == null) {
            user.setRecoveryKey(existingUser.getRecoveryKey());
        }
        if (user.getIpAddress() == null || user.getIpAddress().trim().isEmpty()) {
            user.setIpAddress(existingUser.getIpAddress());
        }
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(existingUser.getCreatedAt());
        }
        if (user.getLastLoginTime() == null) {
            user.setLastLoginTime(existingUser.getLastLoginTime());
        }
        if (user.getMarkTime() == null) {
            user.setMarkTime(existingUser.getMarkTime());
        }
        if (user.getMarkReason() == null) {
            user.setMarkReason(existingUser.getMarkReason());
        }
        if (user.getPasswordUpdatedAt() == null) {
            user.setPasswordUpdatedAt(existingUser.getPasswordUpdatedAt());
        }
        if (user.getFailedLoginCount() == null) {
            user.setFailedLoginCount(existingUser.getFailedLoginCount());
        }
        if (user.getLockedUntil() == null) {
            user.setLockedUntil(existingUser.getLockedUntil());
        }
        try {
            User updatedUser = userService.save(user);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 删除用户
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        User existingUser = userService.findById(id);
        if (existingUser == null) {
            return ResponseEntity.notFound().build();
        }
        userService.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{username}/access-status")
    public ResponseEntity<Map<String, Object>> getAccessStatus(@PathVariable String username) {
        User user = userService.findActiveByUsername(username);
        Map<String, Object> response = new HashMap<String, Object>();
        String reason = userService.getAccessBlockReason(user);
        response.put("canAccess", reason == null);
        response.put("reason", reason);
        response.put("username", username);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{username}/login-success")
    public ResponseEntity<User> recordLoginSuccess(@PathVariable String username) {
        User user = userService.recordLoginSuccess(username);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(user);
    }

    @PostMapping("/{username}/login-failure")
    public ResponseEntity<User> recordLoginFailure(@PathVariable String username) {
        User user = userService.recordLoginFailure(username);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(user);
    }

    @GetMapping("/check-username")
    public ResponseEntity<Map<String, Object>> checkUsername(@RequestParam("username") String username) {
        Map<String, Object> response = new HashMap<String, Object>();
        boolean available = userService.isUsernameAvailable(username);
        response.put("code", 200);
        response.put("msg", available ? "用户名可用" : "用户名已存在");
        Map<String, Object> data = new HashMap<String, Object>();
        data.put("available", available);
        response.put("data", data);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = userService.register(
                stringVal(body.get("username")),
                stringVal(body.get("password")),
                stringVal(body.get("recoveryKey")),
                stringVal(body.get("ipAddress")),
                stringVal(body.get("birthday")),
                body.get("gender") == null ? null : Byte.valueOf(String.valueOf(body.get("gender")))
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = userService.login(
                stringVal(body.get("username")),
                stringVal(body.get("password")),
                stringVal(body.get("ipAddress"))
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/retrieve/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, Object> body) {
        Integer userId = null;
        if (body.get("userId") != null && !"".equals(String.valueOf(body.get("userId")).trim())) {
            userId = Integer.valueOf(String.valueOf(body.get("userId")));
        }
        Map<String, Object> result = userService.resetPassword(
                stringVal(body.get("username")),
                userId,
                stringVal(body.get("recoveryKey")),
                stringVal(body.get("newPassword")),
                stringVal(body.get("newRecoveryKey"))
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/retrieve/username")
    public ResponseEntity<Map<String, Object>> retrieveUsername(@RequestParam("userId") Integer userId) {
        User user = userService.findByUserIdForRetrieve(userId);
        Map<String, Object> result = new HashMap<String, Object>();
        if (user == null) {
            result.put("code", 404);
            result.put("msg", "该用户ID不存在");
            result.put("data", null);
            return ResponseEntity.ok(result);
        }
        result.put("code", 200);
        result.put("msg", "查询成功");
        Map<String, Object> data = new HashMap<String, Object>();
        data.put("username", user.getUsername());
        result.put("data", data);
        return ResponseEntity.ok(result);
    }

    private String stringVal(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}