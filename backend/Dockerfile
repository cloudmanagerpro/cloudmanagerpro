# syntax=docker/dockerfile:1

# =============================================================================
# CloudManagerPro backend — multi-stage build
#   stage 1: build the Spring Boot fat jar with Maven (JDK 17)
#   stage 2: minimal JRE runtime, non-root, container healthcheck on /api/health
# =============================================================================

# ---- Build stage ----------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace

# Resolve dependencies first so they are cached as long as pom.xml is unchanged.
COPY pom.xml .
RUN mvn -B -e -ntp dependency:go-offline

# Build the application jar (tests are run separately in CI, skipped here).
COPY src ./src
RUN mvn -B -e -ntp clean package -DskipTests

# ---- Runtime stage --------------------------------------------------------
FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app

# curl is used by the container HEALTHCHECK below.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Run as a dedicated non-root user.
RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --home-dir /app --shell /usr/sbin/nologin app

COPY --from=build /workspace/target/cloudmanagerpro-backend-*.jar /app/app.jar
RUN chown -R app:app /app
USER app

ENV JAVA_OPTS=""
EXPOSE 8080

# Flyway runs migrations on startup; the app needs a moment before it is healthy.
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=10 \
  CMD curl -fsS http://localhost:8080/api/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
