package profile

import (
	"time"
)

type BudgetProfile struct {
	UserID                string    `json:"user_id"`
	TrackingCadence       string    `json:"tracking_cadence"`
	WeekStartsOn          int       `json:"week_starts_on"`
	MonthlyAnchorDay      int       `json:"monthly_anchor_day"`
	CurrencyCode          string    `json:"currency_code"`
	Locale                string    `json:"locale"`
	Timezone              string    `json:"timezone"`
	IncomeAmountCents     int64     `json:"income_amount_cents"`
	IncomeCadence         string    `json:"income_cadence"`
	LocationCode          string    `json:"location_code"`
	EstimatedTaxRateBps   int       `json:"estimated_tax_rate_bps"`
	SmartBudgetingEnabled bool      `json:"smart_budgeting_enabled"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

type UpdateBudgetProfileRequest struct {
	TrackingCadence       string `json:"tracking_cadence"`
	WeekStartsOn          int    `json:"week_starts_on"`
	MonthlyAnchorDay      int    `json:"monthly_anchor_day"`
	CurrencyCode          string `json:"currency_code"`
	Locale                string `json:"locale"`
	Timezone              string `json:"timezone"`
	IncomeAmountCents     int64  `json:"income_amount_cents"`
	IncomeCadence         string `json:"income_cadence"`
	LocationCode          string `json:"location_code"`
	EstimatedTaxRateBps   int    `json:"estimated_tax_rate_bps"`
	SmartBudgetingEnabled bool   `json:"smart_budgeting_enabled"`
}
