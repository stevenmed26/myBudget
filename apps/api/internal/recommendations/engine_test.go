package recommendations

import (
	"testing"

	"mybudget-api/internal/profile"
)

func TestBuildBudgetSuggestionsNoDataKeepsCurrentBudget(t *testing.T) {
	weekly := "weekly"
	resp, err := BuildBudgetSuggestions([]categoryHistoryRow{
		{
			CategoryID:           "cat-1",
			CategoryName:         "Food",
			CategoryColor:        "#F97316",
			CurrentBudgetCents:   15_000,
			CurrentBudgetCadence: &weekly,
		},
	}, testProfile(), 90)
	if err != nil {
		t.Fatal(err)
	}

	got := resp.BudgetSuggestions[0]
	if got.SuggestedBudgetCents != 15_000 {
		t.Fatalf("expected suggestion to keep current budget, got %d", got.SuggestedBudgetCents)
	}
	if got.Confidence != "low" || got.RecommendationDirection != "keep" {
		t.Fatalf("expected low-confidence keep, got confidence=%s direction=%s", got.Confidence, got.RecommendationDirection)
	}
}

func TestBuildBudgetSuggestionsRecurringSpendCanCreateHighConfidenceIncrease(t *testing.T) {
	resp, err := BuildBudgetSuggestions([]categoryHistoryRow{
		{
			CategoryID:                 "cat-1",
			CategoryName:               "Subscriptions",
			CategoryColor:              "#4F7CFF",
			CurrentBudgetCents:         2_000,
			RecentSpentCents:           180_000,
			RecurringSpentCents:        180_000,
			OutlierAdjustedSpentCents:  180_000,
			TransactionCount:           12,
			PositiveSpendDays:          12,
			ActiveRecurringYearlyCents: 312_000,
		},
	}, testProfile(), 90)
	if err != nil {
		t.Fatal(err)
	}

	got := resp.BudgetSuggestions[0]
	if got.Confidence != "high" {
		t.Fatalf("expected high confidence, got %s", got.Confidence)
	}
	if got.RecommendationDirection != "increase" {
		t.Fatalf("expected increase, got %s", got.RecommendationDirection)
	}
	if got.PredictableSpendCents != 6_000 {
		t.Fatalf("expected weekly predictable spend of 6000, got %d", got.PredictableSpendCents)
	}
}

func TestBuildBudgetSuggestionsUsesOutlierAdjustedSpend(t *testing.T) {
	resp, err := BuildBudgetSuggestions([]categoryHistoryRow{
		{
			CategoryID:                "cat-1",
			CategoryName:              "Shopping",
			CategoryColor:             "#22C55E",
			CurrentBudgetCents:        5_000,
			RecentSpentCents:          100_000,
			VariableSpentCents:        100_000,
			OutlierAdjustedSpentCents: 20_000,
			TransactionCount:          12,
			PositiveSpendDays:         12,
			MaxDailySpendCents:        80_000,
		},
	}, testProfile(), 90)
	if err != nil {
		t.Fatal(err)
	}

	got := resp.BudgetSuggestions[0]
	if got.SuggestedBudgetCents >= got.AverageSpentCents {
		t.Fatalf("expected outlier-adjusted suggestion below raw average, got suggestion=%d average=%d", got.SuggestedBudgetCents, got.AverageSpentCents)
	}
}

func TestBuildBudgetSuggestionsFitsVariableSpendToIncome(t *testing.T) {
	p := testProfile()
	p.IncomeAmountCents = 10_000

	resp, err := BuildBudgetSuggestions([]categoryHistoryRow{
		{
			CategoryID:                 "fixed",
			CategoryName:               "Rent",
			CategoryColor:              "#6366F1",
			CurrentBudgetCents:         6_000,
			RecentSpentCents:           30_000,
			RecurringSpentCents:        30_000,
			OutlierAdjustedSpentCents:  30_000,
			TransactionCount:           12,
			PositiveSpendDays:          12,
			ActiveRecurringYearlyCents: 312_000,
		},
		{
			CategoryID:                "variable",
			CategoryName:              "Food",
			CategoryColor:             "#F97316",
			CurrentBudgetCents:        9_000,
			RecentSpentCents:          180_000,
			VariableSpentCents:        180_000,
			OutlierAdjustedSpentCents: 180_000,
			TransactionCount:          30,
			PositiveSpendDays:         30,
		},
	}, p, 90)
	if err != nil {
		t.Fatal(err)
	}

	if resp.Summary.SuggestedBudgetTotalCents > resp.Summary.NetIncomeBudgetCents {
		t.Fatalf("expected suggestions to fit income, got total=%d income=%d", resp.Summary.SuggestedBudgetTotalCents, resp.Summary.NetIncomeBudgetCents)
	}
	if resp.BudgetSuggestions[1].SuggestedBudgetCents >= resp.BudgetSuggestions[1].AverageSpentCents {
		t.Fatalf("expected variable suggestion to be scaled down")
	}
}

func testProfile() *profile.BudgetProfile {
	return &profile.BudgetProfile{
		TrackingCadence:       "weekly",
		IncomeAmountCents:     100_000,
		IncomeCadence:         "weekly",
		EstimatedTaxRateBps:   0,
		SmartBudgetingEnabled: true,
	}
}
