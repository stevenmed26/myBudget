package home

type CategoryProgress struct {
	CategoryID           string `json:"category_id"`
	CategoryName         string `json:"category_name"`
	CategoryColor        string `json:"category_color"`
	CountsTowardBudget   bool   `json:"counts_toward_budget"`
	BudgetAmountCents    int64  `json:"budget_amount_cents"`
	SpentAmountCents     int64  `json:"spent_amount_cents"`
	RemainingAmountCents int64  `json:"remaining_amount_cents"`
	PercentUsed          int64  `json:"percent_used"`
}

type HomeSummary struct {
	UserID                string             `json:"user_id"`
	PeriodStart           string             `json:"period_start"`
	PeriodEnd             string             `json:"period_end"`
	TrackingCadence       string             `json:"tracking_cadence"`
	NetIncomeBudgetCents  int64              `json:"net_income_budget_cents"`
	SpentAmountCents      int64              `json:"spent_amount_cents"`
	RemainingAmountCents  int64              `json:"remaining_amount_cents"`
	CategoryProgressItems []CategoryProgress `json:"category_progress_items"`
}
