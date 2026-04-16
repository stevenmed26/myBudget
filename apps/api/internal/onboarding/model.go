package onboarding

type StatusResponse struct {
	Completed bool `json:"completed"`
}

type CategoryBudgetInput struct {
	CategoryName string `json:"category_name"`
	AmountCents int64 `json:"amount_cents"`
	Cadence string `json:"cadence"`
}

type SubmitRequest struct {
	TrackingCadence string `json:"tracking_cadence"`
	WeekStartsOn int `json:"week_starts_on"`
	MonthlyAnchorDay int `json:"monthly_anchor_day"`
	IncomeAmountCents int64 `json:"income_amount_cents"`
	IncomeCadence string `json:"income_cadence"`
	LocationCode string `json:"location_code"`
	EstimatedTaxRateBps int `json:"estimated_tax_rate_bps"`
	CategoryBudgets []CategoryBudgetInput `json:"category_budgets"`
}