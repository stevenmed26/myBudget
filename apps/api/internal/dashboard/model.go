package dashboard

type Summary struct {
	PeriodStart     string `json:"period_start"`
	PeriodEnd       string `json:"period_end"`
	IncomeCents     int64  `json:"income_cents"`
	ExpenseCents    int64  `json:"expense_cents"`
	SavedCents      int64  `json:"saved_cents"`
	NetCents        int64  `json:"net_cents"`
	RemainingBudget int64  `json:"remaining_budget_cents"`
}
