package auth

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

type AuthResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         AuthUserDTO `json:"user"`
}

type AuthUserDTO struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type UserRecord struct {
	ID           string
	Email        string
	PasswordHash *string
}
