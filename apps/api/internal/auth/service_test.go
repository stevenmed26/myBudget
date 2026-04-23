package auth

import (
	"testing"
	"time"

	"mybudget-api/internal/config"
)

func TestNormalizeVerificationCodeKeepsOnlyDigits(t *testing.T) {
	got := normalizeVerificationCode(" 123-456 ")
	if got != "123456" {
		t.Fatalf("normalizeVerificationCode = %q, want 123456", got)
	}
}

func TestVerificationSendCooldownIsDisabledInDevelopment(t *testing.T) {
	service := NewService(nil, config.Config{AppEnv: "development"})
	if got := service.verificationSendCooldown(); got != 0 {
		t.Fatalf("development cooldown = %s, want 0", got)
	}

	service = NewService(nil, config.Config{AppEnv: "production"})
	if got := service.verificationSendCooldown(); got != time.Minute {
		t.Fatalf("production cooldown = %s, want %s", got, time.Minute)
	}
}
