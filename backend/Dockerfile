# Build stage: compile the backend with Maven. Tests are skipped here because
# they need Docker (Testcontainers); run them in CI or locally with ./mvnw verify.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# Runtime stage: only the JRE and the built jar.
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/mpladsentinel-backend-0.0.1-SNAPSHOT.jar app.jar

# Render provides PORT; fall back to 10000 when running the image locally.
ENTRYPOINT ["sh", "-c", "exec java -jar /app/app.jar --server.port=${PORT:-10000}"]
