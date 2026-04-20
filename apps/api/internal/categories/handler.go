package categories

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/jackc/pgconn"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/httpx"
)

var hexColorPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{
		repo: repo,
	}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.repo.ListByUser(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to load categories")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"categories": items,
	})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateCategoryRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Color = strings.TrimSpace(req.Color)
	if req.Icon != nil {
		trimmed := strings.TrimSpace(*req.Icon)
		req.Icon = &trimmed
	}

	if req.Name == "" {
		httpx.WriteError(w, http.StatusBadRequest, "name is required")
		return
	}
	if len(req.Name) > 64 {
		httpx.WriteError(w, http.StatusBadRequest, "name must be 64 characters or fewer")
		return
	}
	if req.Color == "" {
		req.Color = "#6B7280"
	}
	if !hexColorPattern.MatchString(req.Color) {
		httpx.WriteError(w, http.StatusBadRequest, "color must be a valid hex value like #22C55E")
		return
	}

	item, err := h.repo.Create(r.Context(), userID, req)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			httpx.WriteError(w, http.StatusConflict, "category name already exists")
			return
		}
		httpx.WriteError(w, http.StatusInternalServerError, "failed to create category")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, item)
}
