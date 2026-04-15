package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	APIPort               string
	DatabaseURL           string
	JWTAccessSecret       string
	JWTRefreshSecret      string
	AccessTokenTTLMinutes string
	RefreshTokenTTLDays   string
	AppEnv                string
}

func Load() Config {
	_ = godotenv.Load()

	cfg := Config{
		APIPort:               getEnv("API_PORT", "8080"),
		DatabaseURL:           getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/mybudget?sslmode=disable"),
		JWTAccessSecret:       getEnv("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
		JWTRefreshSecret:      getEnv("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
		AccessTokenTTLMinutes: getEnv("ACCESS_TOKEN_TTL_MINUTES", "15"),
		RefreshTokenTTLDays:   getEnv("REFRESH_TOKEN_TTL_DAYS", "30"),
		AppEnv:                getEnv("APP_ENV", "development"),
	}

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
		return fallback
	}
	return v
}