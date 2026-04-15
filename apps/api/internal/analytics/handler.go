package analytics

import (
	"net/http"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/httpx"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	totalSaved, err := h.repo.GetTotalSaved(r.Context(), userID)
	if err != nil {
		httpx.WriteInternalError(w, "analytics total saved failed", err, "failed to load analytics")
		return
	}

	totalIncome, totalExpenses, err := h.repo.GetTotals(r.Context(), userID)
	if err != nil {
		httpx.WriteInternalError(w, "analytics totals failed", err, "failed to load analytics")
		return
	}

	breakdown, err := h.repo.GetCategoryBreakdown(r.Context(), userID)
	if err != nil {
		httpx.WriteInternalError(w, "analytics category breakdown failed", err, "failed to load analytics")
		return
	}

	trend, err := h.repo.GetMonthlyTrend(r.Context(), userID)
	if err != nil {
		httpx.WriteInternalError(w, "analytics monthly trend failed", err, "failed to load analytics")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, AnalyticsSummary{
		TotalSavedCents:    totalSaved,
		TotalExpensesCents: totalExpenses,
		TotalIncomeCents:   totalIncome,
		CategoryBreakdown:  breakdown,
		MonthlyTrend:       trend,
	})
}