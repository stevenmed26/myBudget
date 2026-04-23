package auth

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/smtp"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"mybudget-api/internal/config"
	"mybudget-api/internal/periods"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo *Repository
	cfg  config.Config
}

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

var (
	ErrEmailPasswordRequired   = errors.New("email and password are required")
	ErrInvalidEmailFormat      = errors.New("enter a valid email address")
	ErrPasswordTooShort        = errors.New("password must be at least 8 characters")
	ErrEmailAlreadyExists      = errors.New("an account with that email already exists")
	ErrInvalidCredentials      = errors.New("invalid email or password")
	ErrRefreshTokenRequired    = errors.New("refresh token is required")
	ErrInvalidRefreshToken     = errors.New("invalid refresh token")
	ErrEmailNotVerified        = errors.New("email not verified")
	ErrVerificationRequired    = errors.New("verification code is required")
	ErrInvalidVerification     = errors.New("invalid or expired verification code")
	ErrVerificationRateLimited = errors.New("too many verification attempts; try again later")
)

const (
	verificationCodeMaxAttempts = 5
	verificationEmailMaxSends   = 5
	verificationIPMaxSends      = 20
	verificationSendCooldown    = time.Minute
	verificationSendWindow      = time.Hour
)

func NewService(repo *Repository, cfg config.Config) *Service {
	return &Service{
		repo: repo,
		cfg:  cfg,
	}
}

func looksLikeEmail(email string) bool {
	return emailPattern.MatchString(strings.TrimSpace(email))
}

func (s *Service) Register(ctx context.Context, req RegisterRequest, ipAddress string) (*VerificationChallengeResponse, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))
	password := req.Password

	if email == "" || password == "" {
		return nil, ErrEmailPasswordRequired
	}
	if !looksLikeEmail(email) {
		return nil, ErrInvalidEmailFormat
	}
	if len(password) < 8 {
		return nil, ErrPasswordTooShort
	}

	user, err := s.repo.GetUserByEmail(ctx, email)
	if err == nil {
		if user.EmailVerifiedAt != nil {
			return nil, ErrEmailAlreadyExists
		}
		return s.issueVerificationChallenge(ctx, user, ipAddress)
	}
	if !IsNotFound(err) {
		return nil, err
	}

	pwHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	loc, locErr := time.LoadLocation("America/Chicago")
	if locErr == nil {
		now = now.In(loc)
	}
	current := periods.GetCurrentPeriod(now, "weekly", 1, 1)
	effectiveFrom := current.StartDate

	user, err = s.repo.CreateUserWithDefaults(ctx, email, string(pwHash), effectiveFrom)
	if err != nil {
		return nil, err
	}

	return s.issueVerificationChallenge(ctx, user, ipAddress)
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))
	password := req.Password

	if email == "" || password == "" {
		return nil, ErrEmailPasswordRequired
	}
	if !looksLikeEmail(email) {
		return nil, ErrInvalidEmailFormat
	}

	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if user.PasswordHash == nil {
		return nil, ErrInvalidCredentials
	}
	if user.EmailVerifiedAt == nil {
		return nil, ErrEmailNotVerified
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) VerifyEmail(ctx context.Context, email, code string) (*AuthResponse, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	code = normalizeVerificationCode(code)

	if !looksLikeEmail(email) {
		return nil, ErrInvalidEmailFormat
	}
	if len(code) != 6 {
		return nil, ErrVerificationRequired
	}

	userID, err := s.repo.ConsumeVerificationCode(ctx, email, code, verificationCodeMaxAttempts)
	if err != nil {
		return nil, ErrInvalidVerification
	}

	if err := s.repo.MarkUserEmailVerified(ctx, userID); err != nil {
		return nil, err
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) ResendVerification(ctx context.Context, email, ipAddress string) (*ResendVerificationResponse, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if !looksLikeEmail(email) {
		return nil, ErrInvalidEmailFormat
	}

	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if IsNotFound(err) {
			if err := s.repo.RecordVerificationSendAttempt(
				ctx,
				email,
				ipAddress,
				verificationEmailMaxSends,
				verificationIPMaxSends,
				s.verificationSendCooldown(),
				verificationSendWindow,
			); err != nil {
				return nil, err
			}
			return &ResendVerificationResponse{
				Sent:     true,
				Email:    email,
				Delivery: "unknown",
			}, nil
		}
		return nil, err
	}

	if user.EmailVerifiedAt != nil {
		return &ResendVerificationResponse{
			Sent:     true,
			Email:    email,
			Delivery: "already_verified",
		}, nil
	}

	challenge, err := s.issueVerificationChallenge(ctx, user, ipAddress)
	if err != nil {
		return nil, err
	}

	return &ResendVerificationResponse{
		Sent:     true,
		Email:    challenge.Email,
		Delivery: challenge.Delivery,
	}, nil
}

func (s *Service) Refresh(ctx context.Context, rawRefreshToken string) (*AuthResponse, error) {
	if strings.TrimSpace(rawRefreshToken) == "" {
		return nil, ErrRefreshTokenRequired
	}

	userID, err := s.repo.ConsumeRefreshToken(ctx, rawRefreshToken)
	if err != nil {
		return nil, ErrInvalidRefreshToken
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) issueVerificationChallenge(ctx context.Context, user *UserRecord, ipAddress string) (*VerificationChallengeResponse, error) {
	if err := s.repo.RecordVerificationSendAttempt(
		ctx,
		user.Email,
		ipAddress,
		verificationEmailMaxSends,
		verificationIPMaxSends,
		s.verificationSendCooldown(),
		verificationSendWindow,
	); err != nil {
		return nil, err
	}

	code, err := generateVerificationCode()
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(15 * time.Minute)
	if err := s.repo.ReplaceVerificationCode(ctx, user.ID, user.Email, code, expiresAt); err != nil {
		return nil, err
	}

	delivery, err := s.sendVerificationCode(user.Email, code)
	if err != nil {
		return nil, err
	}

	return &VerificationChallengeResponse{
		RequiresVerification: true,
		Email:                user.Email,
		Delivery:             delivery,
	}, nil
}

func normalizeVerificationCode(code string) string {
	var b strings.Builder
	for _, r := range code {
		if unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func (s *Service) verificationSendCooldown() time.Duration {
	if s.cfg.AppEnv == "development" || s.cfg.AppEnv == "test" {
		return 0
	}
	return verificationSendCooldown
}

func generateVerificationCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func (s *Service) sendVerificationCode(email, code string) (string, error) {
	if s.smtpConfigured() {
		addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)

		auth := smtp.PlainAuth("", s.cfg.SMTPUsername, s.cfg.SMTPPassword, s.cfg.SMTPHost)

		body := "" +
			"Subject: Verify your myBudget email\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/plain; charset=\"UTF-8\"\r\n" +
			"\r\n" +
			"Your myBudget verification code is: " + code + "\r\n" +
			"This code expires in 15 minutes.\r\n"

		if err := smtp.SendMail(addr, auth, s.cfg.EmailFrom, []string{email}, []byte(body)); err != nil {
			return "", err
		}

		return "email", nil
	}

	if s.cfg.AppEnv == "development" {
		log.Printf("DEV verification code for %s: %s", email, code)
		return "development_log", nil
	}

	return "", errors.New("email delivery is not configured")
}

func (s *Service) smtpConfigured() bool {
	return s.cfg.SMTPHost != "" &&
		s.cfg.SMTPPort != "" &&
		s.cfg.SMTPUsername != "" &&
		s.cfg.SMTPPassword != "" &&
		s.cfg.EmailFrom != ""
}

func (s *Service) issueTokens(ctx context.Context, user *UserRecord) (*AuthResponse, error) {
	accessTTLMinutes, _ := strconv.Atoi(s.cfg.AccessTokenTTLMinutes)
	refreshTTLDays, _ := strconv.Atoi(s.cfg.RefreshTokenTTLDays)

	now := time.Now()
	accessExp := now.Add(time.Duration(accessTTLMinutes) * time.Minute)
	refreshExp := now.Add(time.Duration(refreshTTLDays) * 24 * time.Hour)

	accessClaims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"exp":   accessExp.Unix(),
		"iat":   now.Unix(),
		"type":  "access",
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	signedAccess, err := accessToken.SignedString([]byte(s.cfg.JWTAccessSecret))
	if err != nil {
		return nil, err
	}

	refreshClaims := jwt.MapClaims{
		"sub":  user.ID,
		"exp":  refreshExp.Unix(),
		"iat":  now.Unix(),
		"type": "refresh",
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	signedRefresh, err := refreshToken.SignedString([]byte(s.cfg.JWTRefreshSecret))
	if err != nil {
		return nil, err
	}

	if err := s.repo.InsertRefreshToken(ctx, user.ID, signedRefresh, refreshExp); err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  signedAccess,
		RefreshToken: signedRefresh,
		User: AuthUserDTO{
			ID:    user.ID,
			Email: user.Email,
		},
	}, nil
}
