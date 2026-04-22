package categories

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgconn"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/devlog"
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

	devlog.Infof("category created user_id=%s category_id=%s name=%q", userID, item.ID, item.Name)
	httpx.WriteJSON(w, http.StatusCreated, item)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	categoryID := strings.TrimSpace(chi.URLParam(r, "categoryID"))
	if categoryID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "categoryID is required")
		return
	}

	if err := h.repo.SoftDelete(r.Context(), userID, categoryID); err != nil {
		if errors.Is(err, ErrCategoryNotFound) {
			httpx.WriteError(w, http.StatusNotFound, "category not found")
			return
		}
		httpx.WriteInternalError(w, "category delete failed", err, "failed to delete category")
		return
	}

	devlog.Infof("category archived user_id=%s category_id=%s", userID, categoryID)
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
}
