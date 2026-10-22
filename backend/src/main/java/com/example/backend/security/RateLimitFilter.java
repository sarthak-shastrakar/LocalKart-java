package com.example.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private record Rule(String name, int limit, Duration window) {
    }

    private static final Rule LOGIN = new Rule("login", 10, Duration.ofMinutes(1));
    private static final Rule REGISTER = new Rule("register", 5, Duration.ofHours(1));
    private static final Rule APPEAL = new Rule("appeal", 3, Duration.ofHours(1));
    private static final Rule APPEAL_STATUS = new Rule("appeal-status", 10, Duration.ofHours(1));

    private final RateLimitService limiter;

    public RateLimitFilter(RateLimitService limiter) {
        this.limiter = limiter;
    }

    private Rule match(String path) {
        return switch (path) {
            case "/api/v1/auth/login" -> LOGIN;
            case "/api/v1/auth/register" -> REGISTER;
            case "/api/v1/auth/appeals" -> APPEAL;
            case "/api/v1/auth/appeals/status" -> APPEAL_STATUS;
            default -> null;
        };
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        Rule rule = "POST".equals(request.getMethod()) ? match(request.getRequestURI()) : null;

        if (rule != null) {
            // getRemoteAddr use kiya, X-Forwarded-For header khud nahi padha (wo fake kiya
            // ja sakta hai)
            String key = rule.name() + ":" + request.getRemoteAddr();
            long retryAfter = limiter.tryAcquire(key, rule.limit(), rule.window());
            if (retryAfter > 0) {
                response.setStatus(429);
                response.setHeader("Retry-After", String.valueOf(retryAfter));
                response.setContentType("application/json");
                response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                response.getWriter().write("{\"timestamp\":\"" + LocalDateTime.now()
                        + "\",\"status\":429,\"message\":\"Too many requests. Please try again in "
                        + retryAfter + " seconds.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}