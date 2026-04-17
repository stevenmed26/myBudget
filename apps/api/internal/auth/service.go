package auth

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"mybudget-api/internal/config"
	"mybudget-api/internal/periods"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo *Repository
	cfg  config.Config
}

func NewService(repo *Repository, cfg config.Config) *Service {
	return &Service{
		repo: repo,
		cfg:  cfg,
	}
}

func (s *Service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))
	password := req.Password

	if email == "" || password == "" {
		return nil, errors.New("email and password are required")
	}
	if len(password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}

	exists, err := s.repo.EmailExists(ctx, email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("email already registered")
	}

	pwHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	loc, err := time.LoadLocation("America/Chicago")
	if err == nil {
		now = now.In(loc)
	}
	current := periods.GetCurrentPeriod(now, "weekly", 1, 1)
	effectiveFrom := current.StartDate
	user, err := s.repo.CreateUserWithDefaults(ctx, email, string(pwHash), effectiveFrom)
	if err != nil {
		return nil, err
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))
	password := req.Password

	if email == "" || password == "" {
		return nil, errors.New("email and password are required")
	}

	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}
	if user.PasswordHash == nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) Refresh(ctx context.Context, rawRefreshToken string) (*AuthResponse, error) {
	if strings.TrimSpace(rawRefreshToken) == "" {
		return nil, errors.New("refresh token is required")
	}

	userID, err := s.repo.ConsumeRefreshToken(ctx, rawRefreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) issueTokens(ctx context.Context, user *UserRecord) (*AuthResponse, error) {
	accessTTLMinutes, err := strconv.Atoi(s.cfg.AccessTokenTTLMinutes)
	if err != nil || accessTTLMinutes <= 0 {
		accessTTLMinutes = 15
	}
	refreshTTLDays, err := strconv.Atoi(s.cfg.RefreshTokenTTLDays)
	if err != nil || refreshTTLDays <= 0 {
		refreshTTLDays = 30
	}

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
