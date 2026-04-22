package recommendations

import (
	"net/http"
	"time"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/httpx"
	"mybudget-api/internal/profile"
	"mybudget-api/internal/recurring"
)

type Handler struct {
	repo             *Repository
	profileRepo      *profile.Repository
	recurringService *recurring.Service
}

func NewHandler(repo *Repository, profileRepo *profile.Repository, recurringService *recurring.Service) *Handler {
	return &Handler{
		repo:             repo,
		profileRepo:      profileRepo,
		recurringService: recurringService,
	}
}

func (h *Handler) BudgetSuggestions(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	currentProfile, err := h.profileRepo.GetCurrentByUser(r.Context(), userID)
	if err != nil {
		httpx.WriteInternalError(w, "budget suggestions profile lookup failed", err, "failed to load budget suggestions")
		return
	}
	if currentProfile == nil {
		httpx.WriteError(w, http.StatusBadRequest, "budget profile not found")
		return
	}
	if !currentProfile.SmartBudgetingEnabled {
		httpx.WriteJSON(w, http.StatusOK, BudgetSuggestionsResponse{
			Summary: BudgetSuggestionSummary{
				TrackingCadence:       currentProfile.TrackingCadence,
				LookbackDays:          90,
				SmartBudgetingEnabled: false,
			},
			BudgetSuggestions: []CategoryBudgetSuggestion{},
		})
		return
	}

	if h.recurringService != nil {
		if _, err := h.recurringService.SyncDueRules(r.Context(), ""); err != nil {
			httpx.WriteInternalError(w, "recurring sync before recommendations failed", err, "failed to load budget suggestions")
			return
		}
	}

	now := time.Now()
	if currentProfile.Timezone != "" {
		if loc, err := time.LoadLocation(currentProfile.Timezone); err == nil {
			now = now.In(loc)
		}
	}

	endDate := now.Format("2006-01-02")
	startDate := now.AddDate(0, 0, -89).Format("2006-01-02")

	rows, err := h.repo.GetCategoryHistoryRows(r.Context(), userID, startDate, endDate)
	if err != nil {
		httpx.WriteInternalError(w, "budget suggestions query failed", err, "failed to load budget suggestions")
		return
	}

	response, err := BuildBudgetSuggestions(rows, currentProfile, 90)
	if err != nil {
		httpx.WriteInternalError(w, "budget suggestions build failed", err, "failed to load budget suggestions")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, response)
}
