package onboarding

import (
	"net/http"
	"strings"
	"time"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/httpx"
	"mybudget-api/internal/periods"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	completed, err := h.repo.IsCompleted(r.Context(), userID)
	if err != nil {
		httpx.WriteInternalError(w, "onboarding status failed", err, "failed to load onboarding status")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, StatusResponse{
		Completed: completed,
	})
}

func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req SubmitRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.TrackingCadence = strings.TrimSpace(req.TrackingCadence)
	req.IncomeCadence = strings.TrimSpace(req.IncomeCadence)
	req.LocationCode = strings.TrimSpace(req.LocationCode)

	if req.TrackingCadence != "weekly" && req.TrackingCadence != "monthly" {
		httpx.WriteError(w, http.StatusBadRequest, "tracking_cadence must be weekly or monthly")
		return
	}
	if req.WeekStartsOn < 0 || req.WeekStartsOn > 6 {
		httpx.WriteError(w, http.StatusBadRequest, "week_starts_on must be between 0 and 6")
		return
	}
	if req.MonthlyAnchorDay < 1 || req.MonthlyAnchorDay > 28 {
		httpx.WriteError(w, http.StatusBadRequest, "monthly_anchor_day must be between 1 and 28")
		return
	}
	switch req.IncomeCadence {
	case "weekly", "biweekly", "monthly", "yearly":
	default:
		httpx.WriteError(w, http.StatusBadRequest, "income_cadence must be weekly, biweekly, monthly, or yearly")
		return
	}
	if req.IncomeAmountCents < 0 {
		httpx.WriteError(w, http.StatusBadRequest, "income_amount_cents must be >= 0")
		return
	}
	if req.EstimatedTaxRateBps < 0 || req.EstimatedTaxRateBps > 10000 {
		httpx.WriteError(w, http.StatusBadRequest, "estimated_tax_rate_bps must be between 0 and 10000")
		return
	}
	if req.LocationCode == "" {
		req.LocationCode = "US-TX"
	}
	for i := range req.CategoryBudgets {
		req.CategoryBudgets[i].CategoryName = strings.TrimSpace(req.CategoryBudgets[i].CategoryName)
		req.CategoryBudgets[i].Cadence = strings.TrimSpace(req.CategoryBudgets[i].Cadence)
		if req.CategoryBudgets[i].CategoryName == "" {
			httpx.WriteError(w, http.StatusBadRequest, "category_name is required")
			return
		}
		if req.CategoryBudgets[i].AmountCents < 0 {
			httpx.WriteError(w, http.StatusBadRequest, "category budget amount_cents must be >= 0")
			return
		}
		switch req.CategoryBudgets[i].Cadence {
		case "weekly", "monthly", "yearly":
		default:
			httpx.WriteError(w, http.StatusBadRequest, "category budget cadence must be weekly, monthly, or yearly")
			return
		}
	}

	now := time.Now()
	current := periods.GetCurrentPeriod(now, req.TrackingCadence, req.WeekStartsOn, req.MonthlyAnchorDay)
	effectiveFrom := current.StartDate

	if err := h.repo.Submit(r.Context(), userID, req, effectiveFrom); err != nil {
		httpx.WriteInternalError(w, "onboarding submit failed", err, "failed to complete onboarding")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, StatusResponse{
		Completed: true,
	})
}
