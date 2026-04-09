package profile

import (
	"mybudget-api/internal/httpx"
	"net/http"
	"strings"
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

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.repo.GetByUser(r.Context(), h.demoUserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	var req UpdateBudgetProfileRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	req.TrackingCadence = strings.TrimSpace(req.TrackingCadence)
	req.CurrencyCode = strings.TrimSpace(req.CurrencyCode)
	req.Locale = strings.TrimSpace(req.Locale)
	req.Timezone = strings.TrimSpace(req.Timezone)
	req.IncomeCadence = strings.TrimSpace(req.IncomeCadence)
	req.LocationCode = strings.TrimSpace(req.LocationCode)

	if req.TrackingCadence == "" {
		req.TrackingCadence = "weekly"
	}
	if req.TrackingCadence != "weekly" && req.TrackingCadence != "monthly" {
		httpx.WriteError(w, http.StatusBadRequest, "tracking_cadence must be 'weekly' or 'monthly'")
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
	if req.CurrencyCode == "" {
		req.CurrencyCode = "USD"
	}
	if req.Locale == "" {
		req.Locale = "en-US"
	}
	if req.Timezone == "" {
		req.Timezone = "America/Chicago"
	}
	if req.IncomeCadence == "" {
		req.IncomeCadence = "monthly"
	}
	switch req.IncomeCadence {
	case "weekly", "biweekly", "monthly", "yearly":
	default:
		httpx.WriteError(w, http.StatusBadRequest, "income_cadence must be weekly, biweekly, monthly, or yearly")
		return
	}
	if req.IncomeAmountCents < 0 {
		httpx.WriteError(w, http.StatusBadRequest, "income_amount_cents must be non-negative")
		return
	}
	if req.LocationCode == "" {
		req.LocationCode = "US-TX"
	}

	item, err := h.repo.UpdateByUser(r.Context(), h.demoUserID, req)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item)
}
