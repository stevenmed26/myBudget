package analytics

import (
	"net/http"

	"mybudget-api/internal/httpx"
	"mybudget-api/internal/auth"
)

type Handler struct {
	repo       *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{
		repo:       repo,
	}
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	totalSaved, err := h.repo.GetTotalSaved(r.Context(), auth.UserIDFromContext(r.Context()))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	totalIncome, totalExpenses, err := h.repo.GetTotals(r.Context(), auth.UserIDFromContext(r.Context()))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	breakdown, err := h.repo.GetCategoryBreakdown(r.Context(), auth.UserIDFromContext(r.Context()))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	trend, err := h.repo.GetMonthlyTrend(r.Context(), auth.UserIDFromContext(r.Context()))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
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
