package com.cloudmanagerpro.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/** Public liveness endpoint. Final URL: GET /api/health. */
@Slf4j
@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
public class HealthController {

    private static final String APP_NAME = "CloudManagerPro";
    private static final String VERSION = "0.1.0";

    private final DataSource dataSource;

    @GetMapping
    public Map<String, Object> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("app", APP_NAME);
        body.put("version", VERSION);
        body.put("timestamp", OffsetDateTime.now());
        body.put("database", databaseStatus());
        return body;
    }

    private String databaseStatus() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(2) ? "UP" : "DOWN";
        } catch (Exception ex) {
            log.debug("Database health check failed: {}", ex.getMessage());
            return "DOWN";
        }
    }
}
