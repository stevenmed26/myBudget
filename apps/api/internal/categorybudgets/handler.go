package categorybudgets

import (
	"mybudget-api/internal/httpx"
	"mybudget-api/internal/auth"
	"net/http"
	"strings"
	"time"
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
	onDate := r.URL.Query().Get("on_date")
	if onDate == "" {
		onDate = time.Now().Format("2006-01-02")
	}

	items, err := h.repo.ListActiveByUser(r.Context(), auth.UserIDFromContext(r.Context()), onDate)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"category_budgets": items,
	})
}

func (h *Handler) Upsert(w http.ResponseWriter, r *http.Request) {
	var req UpsertCategoryBudgetRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
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
		// valid
	default:
		httpx.WriteError(w, http.StatusBadRequest, "cadence must be weekly, monthly, or yearly")
		return
	}
	if req.EffectiveFrom == "" {
		req.EffectiveFrom = time.Now().Format("2006-01-02")
	}
	item, err := h.repo.UpsertNewVersion(r.Context(), req)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, item)
}
