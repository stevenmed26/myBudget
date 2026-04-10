package periodclose

type ClosePeriodResponse struct {
	PeriodStart          string `json:"period_start"`
	PeriodEnd            string `json:"period_end"`
	Status               string `json:"status"`
	NetIncomeBudgetCents int64  `json:"net_income_budget_cents"`
	SpentAmountCents     int64  `json:"spent_amount_cents"`
	LeftoverAmountCents  int64  `json:"leftover_amount_cents"`
	SavedTransactionID   string `json:"saved_transaction_id,omitempty"`
	AlreadyClosed        bool   `json:"already_closed,omitempty"`
}
