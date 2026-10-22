package com.example.backend.security;

import com.example.backend.exception.ApiException;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
public class LoginAttemptService {

    private static final int MAX_FAILS = 5;
    private static final Duration LOCK = Duration.ofSeconds(150);
    private static final Duration FAIL_WINDOW = Duration.ofMinutes(5);

    private final StringRedisTemplate redis;

    public LoginAttemptService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    private String failKey(String email) {
        return "login:fail:" + email;
    }

    private String lockKey(String email) {
        return "login:lock:" + email;
    }

    public void checkNotLocked(String email) {
        Long ttl = null;
        try {
            ttl = redis.getExpire(lockKey(email), TimeUnit.SECONDS);
        } catch (DataAccessException e) {
            // Redis band: lock check skip
        }
        if (ttl != null && ttl > 0) {
            String wait = ttl >= 60 ? (ttl / 60) + " min " + (ttl % 60) + " sec" : ttl + " sec";
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed attempts. Try again in " + wait + ".");
        }
    }

    public void recordFailure(String email) {
        try {
            Long fails = redis.opsForValue().increment(failKey(email));
            if (fails != null && fails == 1) {
                redis.expire(failKey(email), FAIL_WINDOW);
            }
            if (fails != null && fails >= MAX_FAILS) {
                redis.opsForValue().set(lockKey(email), "1", LOCK);
                redis.delete(failKey(email));
            }
        } catch (DataAccessException e) {
            // Redis band: ignore
        }
    }

    public void recordSuccess(String email) {
        try {
            redis.delete(failKey(email));
        } catch (DataAccessException e) {
            // ignore
        }
    }
}