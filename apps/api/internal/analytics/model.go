package analytics

type AnalyticsSummary struct {
	TotalSavedCents    int64                    `json:"total_saved_cents"`
	TotalExpensesCents int64                    `json:"total_expenses_cents"`
	TotalIncomeCents   int64                    `json:"total_income_cents"`
	CategoryBreakdown  []AnalyticsCategorySlice `json:"category_breakdown"`
	MonthlyTrend       []AnalyticsTrendPoint    `json:"monthly_trend"`
}

type AnalyticsCategorySlice struct {
	CategoryID   string `json:"category_id"`
	CategoryName string `json:"category_name"`
	Color        string `json:"color"`
	AmountCents  int64  `json:"amount_cents"`
}

type AnalyticsTrendPoint struct {
	Label        string `json:"label"`
	IncomeCents  int64  `json:"income_cents"`
	ExpenseCents int64  `json:"expense_cents"`
}
