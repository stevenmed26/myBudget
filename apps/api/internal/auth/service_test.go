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

func TestSMTPConfiguredRequiresAllResendFields(t *testing.T) {
	service := NewService(nil, config.Config{
		SMTPHost:     "smtp.resend.com",
		SMTPPort:     "587",
		SMTPUsername: "resend",
		SMTPPassword: "re_test",
		EmailFrom:    "MyBudget <onboarding@example.com>",
	})
	if !service.smtpConfigured() {
		t.Fatal("smtpConfigured = false, want true")
	}

	service = NewService(nil, config.Config{
		SMTPHost:     "smtp.resend.com",
		SMTPPort:     "587",
		SMTPUsername: "resend",
		EmailFrom:    "MyBudget <onboarding@example.com>",
	})
	if service.smtpConfigured() {
		t.Fatal("smtpConfigured = true with missing password, want false")
	}
}
