package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"

	"mybudget-api/internal/devlog"
)

type Config struct {
	APIPort               string
	DatabaseURL           string
	JWTAccessSecret       string
	JWTRefreshSecret      string
	AccessTokenTTLMinutes string
	RefreshTokenTTLDays   string
	AppEnv                string

	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	EmailFrom    string
}

func Load() Config {
	_ = godotenv.Load()
	devlog.Debugf("config: attempted .env load")

	cfg := Config{
		APIPort:               getEnv("API_PORT", "8080"),
		DatabaseURL:           getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/mybudget?sslmode=disable"),
		JWTAccessSecret:       getEnv("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
		JWTRefreshSecret:      getEnv("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
		AccessTokenTTLMinutes: getEnv("ACCESS_TOKEN_TTL_MINUTES", "15"),
		RefreshTokenTTLDays:   getEnv("REFRESH_TOKEN_TTL_DAYS", "30"),
		AppEnv:                getEnv("APP_ENV", "development"),

		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     os.Getenv("SMTP_PORT"),
		SMTPUsername: os.Getenv("SMTP_USERNAME"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		EmailFrom:    os.Getenv("EMAIL_FROM"),
	}

	devlog.Infof(
		"config: loaded app_env=%s api_port=%s access_ttl=%s refresh_ttl_days=%s db_url_set=%t",
		cfg.AppEnv,
		cfg.APIPort,
		cfg.AccessTokenTTLMinutes,
		cfg.RefreshTokenTTLDays,
		cfg.DatabaseURL != "",
	)

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	if cfg.AppEnv != "development" {
		if cfg.JWTAccessSecret == "dev-access-secret-change-me" {
			log.Fatal("JWT_ACCESS_SECRET must be set in non-development environments")
		}
		if cfg.JWTRefreshSecret == "dev-refresh-secret-change-me" {
			log.Fatal("JWT_REFRESH_SECRET must be set in non-development environments")
		}
	}

	return cfg
}

func getEnv(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Printf("Warning: %s not set, using default value: %s", key, fallback)
		devlog.Warnf("config: env missing key=%s using fallback", key)
		return fallback
	}
	devlog.Debugf("config: env present key=%s", key)
	return v
}
