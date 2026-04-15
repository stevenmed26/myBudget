package profile

import (
	"net/http"
	"strings"
	"time"

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

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.repo.GetCurrentByUser(r.Context(), auth.UserIDFromContext(r.Context()))
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
		httpx.WriteError(w, http.StatusBadRequest, "tracking_cadence must be weekly or monthly")
		return
	}
	if req.WeekStartsOn < 0 || req.WeekStartsOn > 6 {
		httpx.WriteError(w, http.StatusBadRequest, "week_starts_on must be 0-6")
		return
	}
	if req.MonthlyAnchorDay < 1 || req.MonthlyAnchorDay > 28 {
		httpx.WriteError(w, http.StatusBadRequest, "monthly_anchor_day must be 1-28")
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

	effectiveFrom := time.Now().Format("2006-01-02")

	item, err := h.repo.InsertNewVersion(r.Context(), auth.UserIDFromContext(r.Context()), req, effectiveFrom)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, item)
}
