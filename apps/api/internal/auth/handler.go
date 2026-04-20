package auth

import (
	"errors"
	"net/http"

	"mybudget-api/internal/httpx"
)

type Handler struct {
	service *Service
	repo    *Repository
}

func NewHandler(service *Service, repo *Repository) *Handler {
	return &Handler{
		service: service,
		repo:    repo,
	}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.service.Register(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrEmailPasswordRequired),
			errors.Is(err, ErrInvalidEmailFormat),
			errors.Is(err, ErrPasswordTooShort):
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
			return
		case errors.Is(err, ErrEmailAlreadyExists):
			httpx.WriteError(w, http.StatusConflict, err.Error())
			return
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "failed to register user")
			return
		}
	}

	httpx.WriteJSON(w, http.StatusCreated, resp)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.service.Login(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrEmailPasswordRequired),
			errors.Is(err, ErrInvalidEmailFormat):
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
			return
		case errors.Is(err, ErrEmailNotVerified):
			httpx.WriteError(w, http.StatusForbidden, err.Error())
			return
		case errors.Is(err, ErrInvalidCredentials):
			httpx.WriteError(w, http.StatusUnauthorized, err.Error())
			return
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "failed to sign in")
			return
		}
	}

	httpx.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req VerifyEmailRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.service.VerifyEmail(r.Context(), req.Email, req.Code)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidEmailFormat),
			errors.Is(err, ErrVerificationRequired):
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
			return
		case errors.Is(err, ErrInvalidVerification):
			httpx.WriteError(w, http.StatusUnauthorized, err.Error())
			return
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "failed to verify email")
			return
		}
	}

	httpx.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req ResendVerificationRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.service.ResendVerification(r.Context(), req.Email)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidEmailFormat):
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
			return
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "failed to resend verification")
			return
		}
	}

	httpx.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "refresh_token is required")
		return
	}

	resp, err := h.service.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.repo.GetUserByID(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "user not found")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, AuthUserDTO{
		ID:    user.ID,
		Email: user.Email,
	})
}
