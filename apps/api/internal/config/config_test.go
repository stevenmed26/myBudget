package config

import (
	"reflect"
	"testing"
)

func TestParseCSVEnvTrimsAndDropsEmptyValues(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", " http://localhost:8081,https://app.example.com, ,")

	got := parseCSVEnv("CORS_ALLOWED_ORIGINS", "*")
	want := []string{"http://localhost:8081", "https://app.example.com"}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("parseCSVEnv() = %#v, want %#v", got, want)
	}
}

func TestAllowsWildcardOrigin(t *testing.T) {
	if !allowsWildcardOrigin([]string{"https://app.example.com", "*"}) {
		t.Fatal("allowsWildcardOrigin() should detect wildcard origins")
	}
	if allowsWildcardOrigin([]string{"https://app.example.com"}) {
		t.Fatal("allowsWildcardOrigin() should ignore explicit origins")
	}
}

func TestValidateRequiresExplicitAppEnv(t *testing.T) {
	cfg := Config{
		DatabaseURL:        devDatabaseURL,
		JWTAccessSecret:    "dev-access-secret-change-me",
		JWTRefreshSecret:   "dev-refresh-secret-change-me",
		CORSAllowedOrigins: []string{"*"},
	}

	if err := validate(cfg); err == nil {
		t.Fatal("validate() should require APP_ENV")
	}
}

func TestValidateRejectsProductionDevDefaults(t *testing.T) {
	cfg := Config{
		AppEnv:             "production",
		DatabaseURL:        devDatabaseURL,
		JWTAccessSecret:    "dev-access-secret-change-me",
		JWTRefreshSecret:   "dev-refresh-secret-change-me",
		CORSAllowedOrigins: []string{"*"},
	}

	if err := validate(cfg); err == nil {
		t.Fatal("validate() should reject development defaults outside development")
	}
}

func TestValidateAcceptsProductionExplicitConfig(t *testing.T) {
	cfg := Config{
		AppEnv:             "production",
		DatabaseURL:        "postgres://app:secret@db.example.com:5432/mybudget?sslmode=require",
		JWTAccessSecret:    "access-secret",
		JWTRefreshSecret:   "refresh-secret",
		CORSAllowedOrigins: []string{"https://app.example.com"},
		SMTPHost:           "smtp.example.com",
		SMTPPort:           "587",
		EmailFrom:          "noreply@example.com",
	}

	if err := validate(cfg); err != nil {
		t.Fatalf("validate() error = %v", err)
	}
}
