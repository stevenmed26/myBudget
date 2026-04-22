package recommendations

type CategoryBudgetSuggestion struct {
	CategoryID              string `json:"category_id"`
	CategoryName            string `json:"category_name"`
	CategoryColor           string `json:"category_color"`
	TrackingCadence         string `json:"tracking_cadence"`
	CurrentBudgetCents      int64  `json:"current_budget_cents"`
	SuggestedBudgetCents    int64  `json:"suggested_budget_cents"`
	AverageSpentCents       int64  `json:"average_spent_cents"`
	RecentSpentCents        int64  `json:"recent_spent_cents"`
	LookbackDays            int    `json:"lookback_days"`
	BasedOnTransactions     int64  `json:"based_on_transactions"`
	RecommendationDirection string `json:"recommendation_direction"`
}
