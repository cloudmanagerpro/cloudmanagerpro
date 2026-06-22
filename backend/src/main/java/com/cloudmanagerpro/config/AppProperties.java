package com.cloudmanagerpro.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/**
 * Strongly-typed binding for all CloudManagerPro configuration under the {@code app.*} prefix.
 * Values are sourced from application{,-local,-docker,-prod}.yml and ultimately from the
 * environment variables Phase 3 supplies via Docker Compose.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Jwt jwt = new Jwt();
    private final Encryption encryption = new Encryption();
    private final Demo demo = new Demo();
    private final Cors cors = new Cors();
    private final Aws aws = new Aws();
    private final Smtp smtp = new Smtp();
    private final Scheduler scheduler = new Scheduler();

    /** Master switch for destructive cloud operations (ENABLE_REAL_CLOUD_ACTIONS). */
    private boolean realCloudActions = false;

    /** Public base URL of the frontend (used for CORS + alert links). */
    private String frontendUrl = "http://localhost:3000";

    @Getter
    @Setter
    public static class Jwt {
        private String secret = "change-me-please-use-a-long-random-development-secret-string-0001";
        private long expirationMs = 86_400_000L;
    }

    @Getter
    @Setter
    public static class Encryption {
        private String secret = "change-me-please-use-a-long-random-development-secret-string-0002";
    }

    @Getter
    @Setter
    public static class Demo {
        private boolean enabled = true;
    }

    @Getter
    @Setter
    public static class Cors {
        private List<String> allowedOrigins = new ArrayList<>(List.of("http://localhost:3000"));
    }

    @Getter
    @Setter
    public static class Aws {
        private String defaultRegion = "us-east-1";
    }

    @Getter
    @Setter
    public static class Smtp {
        private String host = "";
        private int port = 587;
        private String username = "";
        private String password = "";
        private String from = "CloudManagerPro <noreply@cloudmanagerpro.local>";
    }

    @Getter
    @Setter
    public static class Scheduler {
        private final Job sync = new Job(true, "0 */10 * * * *");
        private final Job analysis = new Job(true, "0 5 */1 * * *");
        private final Job costIngestion = new Job(true, "0 30 2 * * *");
        private final Job alert = new Job(true, "0 0 8 * * *");
    }

    @Getter
    @Setter
    public static class Job {
        private boolean enabled;
        private String cron;

        public Job() {
        }

        public Job(boolean enabled, String cron) {
            this.enabled = enabled;
            this.cron = cron;
        }
    }
}
