package auth

import "time"

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type VerifyEmailRequest struct {
	Email string `json:"email"`
	Code string `json:"code"`
}

type ResendVerificationRequest struct {
	Email string `json:"email"`
}

type AuthResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         AuthUserDTO `json:"user"`
}

type VerificationChallengeResponse struct {
	RequiresVerification bool `json:"requires_verification"`
	Email string `json:"email"`
	Delivery string `json:"delivery"`
}

type ResendVerificationResponse struct {
	Sent bool `json:"sent"`
	Email string `json:"email"`
	Delivery string `json:"delivery"`
}

type AuthUserDTO struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type UserRecord struct {
	ID           string
	Email        string
	PasswordHash *string
	EmailVerifiedAt *time.Time
}
