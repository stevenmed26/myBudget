package analytics

import (
	"net/http"

	"mybudget-api/internal/httpx"
)

type Handler struct {
	repo       *Repository
	demoUserID string
}

func NewHandler(repo *Repository, demoUserID string) *Handler {
	return &Handler{
		repo:       repo,
		demoUserID: demoUserID,
	}
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	totalSaved, err := h.repo.GetTotalSaved(r.Context(), h.demoUserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	totalIncome, totalExpenses, err := h.repo.GetTotals(r.Context(), h.demoUserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	breakdown, err := h.repo.GetCategoryBreakdown(r.Context(), h.demoUserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	trend, err := h.repo.GetMonthlyTrend(r.Context(), h.demoUserID)
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
