package com.wiki.service.impl;

import com.wiki.entity.User;
import com.wiki.repository.UserRepository;
import com.wiki.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class UserServiceImpl implements UserService {
    private static final int MAX_FAILED_LOGIN_COUNT = 5;
    private static final long LOCK_MINUTES = 30;

    @Autowired
    private UserRepository userRepository;

    @Override
    public List<User> findAll() {
        return userRepository.findAll();
    }

    @Override
    public User findById(Integer id) {
        return userRepository.findById(id).orElse(null);
    }

    @Override
    public User findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Override
    public User findActiveByUsername(String username) {
        return userRepository.findByUsernameAndDeletedAtIsNull(username);
    }

    @Override
    public User save(User user) {
        validateUserType(user.getUserType());
        validateGender(user.getGender());
        normalizeUser(user);
        return userRepository.save(user);
    }

    @Override
    public User recordLoginSuccess(String username) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username);
        if (user == null) {
            return null;
        }
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        user.setLastLoginTime(new Date());
        return userRepository.save(user);
    }

    @Override
    public User recordLoginFailure(String username) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username);
        if (user == null) {
            return null;
        }

        int failedCount = user.getFailedLoginCount() == null ? 0 : user.getFailedLoginCount();
        failedCount++;
        user.setFailedLoginCount(failedCount);

        if (failedCount >= MAX_FAILED_LOGIN_COUNT) {
            user.setLockedUntil(new Date(System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(LOCK_MINUTES)));
        }
        return userRepository.save(user);
    }

    @Override
    public boolean canAccess(String username) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username);
        return user != null && getAccessBlockReason(user) == null;
    }

    @Override
    public String getAccessBlockReason(User user) {
        if (user == null) {
            return "USER_NOT_FOUND_OR_DELETED";
        }
        if (user.getUserType() != null && user.getUserType() == 3) {
            return "USER_BANNED";
        }
        if (Boolean.TRUE.equals(user.getMarked())) {
            return "USER_MARKED_IN_PENALTY";
        }
        if (user.getLockedUntil() != null && user.getLockedUntil().after(new Date())) {
            return "ACCOUNT_LOCKED";
        }
        return null;
    }

    @Override
    public void deleteById(Integer id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return;
        }
        user.setDeletedAt(new Date());
        user.setUserType((byte) 3);
        userRepository.save(user);
    }

    private void normalizeUser(User user) {
        Date now = new Date();
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(now);
        }
        if (user.getMarked() == null) {
            user.setMarked(false);
        }
        if (user.getFailedLoginCount() == null) {
            user.setFailedLoginCount(0);
        }
        if (user.getUserType() == null) {
            user.setUserType((byte) 2);
        }
        if (user.getGender() == null) {
            user.setGender((byte) 2);
        }

        if (!Boolean.TRUE.equals(user.getMarked())) {
            user.setMarkTime(null);
            user.setMarkReason(null);
        } else if (user.getMarkTime() == null) {
            user.setMarkTime(now);
        }

        User existing = user.getId() == null ? null : userRepository.findById(user.getId()).orElse(null);
        if (existing != null) {
            if (isPasswordChanged(existing, user)) {
                user.setPasswordUpdatedAt(now);
            } else if (user.getPasswordUpdatedAt() == null) {
                user.setPasswordUpdatedAt(existing.getPasswordUpdatedAt());
            }
        } else if (user.getPasswordUpdatedAt() == null) {
            user.setPasswordUpdatedAt(now);
        }
    }

    private boolean isPasswordChanged(User existing, User incoming) {
        if (incoming.getPasswordHash() == null) {
            return false;
        }
        return existing.getPasswordHash() == null || !existing.getPasswordHash().equals(incoming.getPasswordHash());
    }

    private void validateUserType(Byte userType) {
        if (userType == null) {
            return;
        }
        if (userType < 0 || userType > 3) {
            throw new IllegalArgumentException("user_type must be in range [0, 3].");
        }
    }

    private void validateGender(Byte gender) {
        if (gender == null) {
            return;
        }
        if (gender < 0 || gender > 2) {
            throw new IllegalArgumentException("gender must be in range [0, 2].");
        }
    }
}