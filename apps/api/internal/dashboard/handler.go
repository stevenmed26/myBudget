package dashboard

import (
	"mybudget-api/internal/httpx"
	"mybudget-api/internal/periods"
	"net/http"
	"time"
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
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	if startDate == "" || endDate == "" {
		current := periods.GetCurrentPeriod(time.Now(), "weekly", 1, 1)
		startDate = current.StartDate
		endDate = current.EndDate
	}

	summary, err := h.repo.SummaryForRange(r.Context(), h.demoUserID, startDate, endDate)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, summary)
}
