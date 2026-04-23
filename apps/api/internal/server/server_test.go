package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"mybudget-api/internal/config"
)

func TestNewRouterHealth(t *testing.T) {
	router := NewRouter(config.Config{
		CORSAllowedOrigins: []string{"*"},
		JWTAccessSecret:    "test-secret",
	}, Dependencies{})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}
