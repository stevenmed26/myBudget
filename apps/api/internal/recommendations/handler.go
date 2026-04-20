package recommendations

import (
	"math"
	"net/http"
	"time"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/httpx"
	"mybudget-api/internal/profile"
	"mybudget-api/internal/recurring"
	"mybudget-api/pkg/normalize"
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
	if h.recurringService != nil {
		if _, err := h.recurringService.SyncDueRules(r.Context(), ""); err != nil {
			httpx.WriteInternalError(w, "recurring sync before recommendations failed", err, "failed to load budget suggestions")
			return
		}
	}

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

	const lookbackDays = 90
	out := make([]CategoryBudgetSuggestion, 0, len(rows))

	for _, row := range rows {
		currentBudget := row.CurrentBudgetCents
		if row.CurrentBudgetCadence != nil && *row.CurrentBudgetCadence != "" {
			converted, err := normalize.ConvertAmount(
				row.CurrentBudgetCents,
				normalize.Cadence(*row.CurrentBudgetCadence),
				normalize.Cadence(currentProfile.TrackingCadence),
			)
			if err == nil {
				currentBudget = converted
			}
		}

		averageSpent := suggestForCadence(row.RecentSpentCents, lookbackDays, currentProfile.TrackingCadence)
		suggested := int64(math.Round(float64(averageSpent)*1.10/100.0)) * 100
		if suggested < 0 {
			suggested = 0
		}

		direction := "keep"
		switch {
		case suggested > currentBudget:
			direction = "increase"
		case suggested < currentBudget:
			direction = "decrease"
		}

		out = append(out, CategoryBudgetSuggestion{
			CategoryID:              row.CategoryID,
			CategoryName:            row.CategoryName,
			CategoryColor:           row.CategoryColor,
			TrackingCadence:         currentProfile.TrackingCadence,
			CurrentBudgetCents:      currentBudget,
			SuggestedBudgetCents:    suggested,
			AverageSpentCents:       averageSpent,
			RecentSpentCents:        row.RecentSpentCents,
			LookbackDays:            lookbackDays,
			BasedOnTransactions:     row.TransactionCount,
			RecommendationDirection: direction,
		})
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"budget_suggestions": out,
	})
}

func suggestForCadence(recentSpentCents int64, lookbackDays int, trackingCadence string) int64 {
	if recentSpentCents <= 0 || lookbackDays <= 0 {
		return 0
	}

	daily := float64(recentSpentCents) / float64(lookbackDays)
	switch trackingCadence {
	case "monthly":
		return int64(math.Round(daily * 30.4375))
	default:
		return int64(math.Round(daily * 7.0))
	}
}
