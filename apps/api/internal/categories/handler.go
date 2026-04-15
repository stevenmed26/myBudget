package categories

import (
	"mybudget-api/internal/httpx"
	"mybudget-api/internal/auth"
	"net/http"
)

type Handler struct {
	repo       *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{
		repo:       repo,
	}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.repo.ListByUser(r.Context(), auth.UserIDFromContext(r.Context()))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"categories": items,
	})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateCategoryRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "name is required")
		return
	}

	if req.Color == "" {
		req.Color = "#6B7280" // default gray
	}

	item, err := h.repo.Create(r.Context(), auth.UserIDFromContext(r.Context()), req)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, item)
}
