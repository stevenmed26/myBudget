package dashboard

import (
	"net/http"
	"time"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/httpx"
	"mybudget-api/internal/periods"
	"mybudget-api/internal/profile"
)

type Handler struct {
	repo        *Repository
	profileRepo *profile.Repository
}

func NewHandler(repo *Repository, profileRepo *profile.Repository) *Handler {
	return &Handler{
		repo:        repo,
		profileRepo: profileRepo,
	}
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	if startDate == "" || endDate == "" {
		p, err := h.profileRepo.GetCurrentByUser(r.Context(), userID)
		if err != nil {
			httpx.WriteInternalError(w, "dashboard summary profile lookup failed", err, "failed to load dashboard summary")
			return
		}
		if p == nil {
			httpx.WriteError(w, http.StatusBadRequest, "no active profile found")
			return
		}

		now := time.Now()
		if p.Timezone != "" {
			if loc, err := time.LoadLocation(p.Timezone); err == nil {
				now = now.In(loc)
			}
		}

		current := periods.GetCurrentPeriod(now, p.TrackingCadence, p.WeekStartsOn, p.MonthlyAnchorDay)
		startDate = current.StartDate
		endDate = current.EndDate
	}

	item, err := h.repo.SummaryForRange(r.Context(), userID, startDate, endDate)
	if err != nil {
		httpx.WriteInternalError(w, "dashboard summary failed", err, "failed to load dashboard summary")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, item)
}
