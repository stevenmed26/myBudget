package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	APIPort     string
	DatabaseURL string
	DemoUserID  string
}

func Load() Config {
	_ = godotenv.Load()

	cfg := Config{
		APIPort:     getEnv("API_PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/mybudget?sslmode=disable"),
		DemoUserID:  getEnv("DEMO_USER_ID", "11111111-1111-1111-1111-111111111111"),
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
