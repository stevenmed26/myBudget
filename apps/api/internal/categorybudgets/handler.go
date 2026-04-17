package categorybudgets

import (
	"net/http"
	"strings"
	"time"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/categories"
	"mybudget-api/internal/httpx"
)

type Handler struct {
	repo         *Repository
	categoryRepo *categories.Repository
}

func NewHandler(repo *Repository, categoryRepo *categories.Repository) *Handler {
	return &Handler{
		repo:         repo,
		categoryRepo: categoryRepo,
	}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	onDate := r.URL.Query().Get("on_date")
	if onDate == "" {
		onDate = time.Now().Format("2006-01-02")
	}

	items, err := h.repo.ListActiveByUser(r.Context(), userID, onDate)
	if err != nil {
		httpx.WriteInternalError(w, "category budgets list failed", err, "failed to load category budgets")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"category_budgets": items,
	})
}

func (h *Handler) Upsert(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req UpsertCategoryBudgetRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.CategoryID = strings.TrimSpace(req.CategoryID)
	req.Cadence = strings.TrimSpace(req.Cadence)
	req.EffectiveFrom = strings.TrimSpace(req.EffectiveFrom)

	if req.CategoryID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "category_id is required")
		return
	}
	if req.AmountCents < 0 {
		httpx.WriteError(w, http.StatusBadRequest, "amount_cents must be >= 0")
		return
	}
	switch req.Cadence {
	case "weekly", "monthly", "yearly":
	default:
		httpx.WriteError(w, http.StatusBadRequest, "cadence must be weekly, monthly, or yearly")
		return
	}
	if req.EffectiveFrom == "" {
		req.EffectiveFrom = time.Now().Format("2006-01-02")
	}

	owned, err := h.categoryRepo.ExistsOwnedByUser(r.Context(), req.CategoryID, userID)
	if err != nil {
		httpx.WriteInternalError(w, "category ownership check failed", err, "failed to update category budget")
		return
	}
	if !owned {
		httpx.WriteError(w, http.StatusBadRequest, "invalid category_id")
		return
	}

	item, err := h.repo.UpsertNewVersion(r.Context(), req)
	if err != nil {
		httpx.WriteInternalError(w, "category budget upsert failed", err, "failed to update category budget")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, item)
}
