package config

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

const devDatabaseURL = "postgres://postgres:postgres@localhost:5432/mybudget?sslmode=disable"

type Config struct {
	APIPort               string
	DatabaseURL           string
	JWTAccessSecret       string
	JWTRefreshSecret      string
	AccessTokenTTLMinutes string
	RefreshTokenTTLDays   string
	AppEnv                string
	CORSAllowedOrigins    []string

	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	EmailFrom    string
}

func Load() Config {
	_ = godotenv.Load()

	cfg := Config{
		APIPort:               getEnv("API_PORT", "8080"),
		DatabaseURL:           getEnv("DATABASE_URL", devDatabaseURL),
		JWTAccessSecret:       getEnv("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
		JWTRefreshSecret:      getEnv("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
		AccessTokenTTLMinutes: getEnv("ACCESS_TOKEN_TTL_MINUTES", "15"),
		RefreshTokenTTLDays:   getEnv("REFRESH_TOKEN_TTL_DAYS", "30"),
		AppEnv:                strings.TrimSpace(os.Getenv("APP_ENV")),
		CORSAllowedOrigins:    parseCSVEnv("CORS_ALLOWED_ORIGINS", "*"),

		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     os.Getenv("SMTP_PORT"),
		SMTPUsername: os.Getenv("SMTP_USERNAME"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		EmailFrom:    os.Getenv("EMAIL_FROM"),
	}

	if err := validate(cfg); err != nil {
		log.Fatal(err)
	}

	return cfg
}

func validate(cfg Config) error {
	if cfg.AppEnv == "" {
		return errors.New("APP_ENV is required")
	}
	if cfg.AppEnv != "development" && cfg.AppEnv != "staging" && cfg.AppEnv != "production" && cfg.AppEnv != "test" {
		return fmt.Errorf("APP_ENV must be one of development, staging, production, or test")
	}
	if cfg.DatabaseURL == "" {
		return errors.New("DATABASE_URL is required")
	}

	if cfg.AppEnv != "development" && cfg.AppEnv != "test" {
		if cfg.DatabaseURL == devDatabaseURL {
			return errors.New("DATABASE_URL must be set outside development")
		}
		if cfg.JWTAccessSecret == "dev-access-secret-change-me" {
			return errors.New("JWT_ACCESS_SECRET must be set outside development")
		}
		if cfg.JWTRefreshSecret == "dev-refresh-secret-change-me" {
			return errors.New("JWT_REFRESH_SECRET must be set outside development")
		}
		if allowsWildcardOrigin(cfg.CORSAllowedOrigins) {
			return errors.New("CORS_ALLOWED_ORIGINS must be set to explicit origins outside development")
		}
		if cfg.SMTPHost == "" || cfg.SMTPPort == "" || cfg.EmailFrom == "" {
			return errors.New("SMTP_HOST, SMTP_PORT, and EMAIL_FROM must be set outside development")
		}
	}

	return nil
}

func getEnv(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Printf("Warning: %s not set, using default value: %s", key, fallback)
		return fallback
	}
	return v
}

func parseCSVEnv(key, fallback string) []string {
	raw := getEnv(key, fallback)
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			values = append(values, value)
		}
	}
	return values
}

func allowsWildcardOrigin(origins []string) bool {
	for _, origin := range origins {
		if origin == "*" {
			return true
		}
	}
	return false
}
