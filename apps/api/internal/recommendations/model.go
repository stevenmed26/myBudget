package recommendations

type CategoryBudgetSuggestion struct {
	CategoryID              string   `json:"category_id"`
	CategoryName            string   `json:"category_name"`
	CategoryColor           string   `json:"category_color"`
	TrackingCadence         string   `json:"tracking_cadence"`
	CurrentBudgetCents      int64    `json:"current_budget_cents"`
	SuggestedBudgetCents    int64    `json:"suggested_budget_cents"`
	AverageSpentCents       int64    `json:"average_spent_cents"`
	VariableSpentCents      int64    `json:"variable_spent_cents"`
	RecurringSpentCents     int64    `json:"recurring_spent_cents"`
	PredictableSpendCents   int64    `json:"predictable_spend_cents"`
	OutlierAdjustedCents    int64    `json:"outlier_adjusted_cents"`
	RecentSpentCents        int64    `json:"recent_spent_cents"`
	LookbackDays            int      `json:"lookback_days"`
	BasedOnTransactions     int64    `json:"based_on_transactions"`
	Confidence              string   `json:"confidence"`
	ConfidenceScore         int      `json:"confidence_score"`
	Reason                  string   `json:"reason"`
	Reasons                 []string `json:"reasons"`
	RecommendationDirection string   `json:"recommendation_direction"`
	ChangeCents             int64    `json:"change_cents"`
	ChangePercent           int64    `json:"change_percent"`
}

type BudgetSuggestionSummary struct {
	TrackingCadence           string `json:"tracking_cadence"`
	LookbackDays              int    `json:"lookback_days"`
	NetIncomeBudgetCents      int64  `json:"net_income_budget_cents"`
	CurrentBudgetTotalCents   int64  `json:"current_budget_total_cents"`
	SuggestedBudgetTotalCents int64  `json:"suggested_budget_total_cents"`
	SuggestedRemainingCents   int64  `json:"suggested_remaining_cents"`
	SuggestedOverIncomeCents  int64  `json:"suggested_over_income_cents"`
	NeedsIncomeFitReview      bool   `json:"needs_income_fit_review"`
}

type BudgetSuggestionsResponse struct {
	Summary           BudgetSuggestionSummary    `json:"summary"`
	BudgetSuggestions []CategoryBudgetSuggestion `json:"budget_suggestions"`
}
