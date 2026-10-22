package com.example.backend.security;

import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
public class RateLimitService {

    private final StringRedisTemplate redis;

    public RateLimitService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    // 0 = allowed, warna kitne seconds baad dobara try karna hai
    public long tryAcquire(String key, int limit, Duration window) {
        String redisKey = "rl:" + key;
        try {
            Long count = redis.opsForValue().increment(redisKey);
            Long ttl = redis.getExpire(redisKey, TimeUnit.SECONDS);

            // pehli request, ya expire set hone se pehle crash ho gaya tha (ttl < 0)
            if (count != null && (count == 1 || ttl == null || ttl < 0)) {
                redis.expire(redisKey, window);
                ttl = window.toSeconds();
            }
            if (count == null || count <= limit)
                return 0;
            return Math.max(1, ttl == null ? 1 : ttl);
        } catch (DataAccessException e) {
            // Redis band hai: app chalti rahe (fail-open)
            return 0;
        }
    }
}