package recommendations

import (
	"math"

	"mybudget-api/internal/profile"
	"mybudget-api/pkg/normalize"
)

func BuildBudgetSuggestions(rows []categoryHistoryRow, currentProfile *profile.BudgetProfile, lookbackDays int) (BudgetSuggestionsResponse, error) {
	out := make([]CategoryBudgetSuggestion, 0, len(rows))
	netIncomeBudget, err := normalize.ConvertAmount(
		currentProfile.IncomeAmountCents,
		normalize.Cadence(currentProfile.IncomeCadence),
		normalize.Cadence(currentProfile.TrackingCadence),
	)
	if err != nil {
		return BudgetSuggestionsResponse{}, err
	}
	netIncomeBudget -= (netIncomeBudget * int64(currentProfile.EstimatedTaxRateBps)) / 10000

	for _, row := range rows {
		currentBudget := row.CurrentBudgetCents
		if row.CurrentBudgetCadence != nil && *row.CurrentBudgetCadence != "" {
			converted, err := normalize.ConvertAmount(
				row.CurrentBudgetCents,
				normalize.Cadence(*row.CurrentBudgetCadence),
				normalize.Cadence(currentProfile.TrackingCadence),
			)
			if err != nil {
				return BudgetSuggestionsResponse{}, err
			}
			currentBudget = converted
		}

		averageSpent := suggestForCadence(row.RecentSpentCents, lookbackDays, currentProfile.TrackingCadence)
		variableSpent := suggestForCadence(row.VariableSpentCents, lookbackDays, currentProfile.TrackingCadence)
		recurringSpent := suggestForCadence(row.RecurringSpentCents, lookbackDays, currentProfile.TrackingCadence)
		outlierAdjusted := suggestForCadence(row.OutlierAdjustedSpentCents, lookbackDays, currentProfile.TrackingCadence)
		predictableSpend, err := normalize.ConvertAmount(
			row.ActiveRecurringYearlyCents,
			normalize.Yearly,
			normalize.Cadence(currentProfile.TrackingCadence),
		)
		if err != nil {
			return BudgetSuggestionsResponse{}, err
		}
		if predictableSpend == 0 {
			predictableSpend = recurringSpent
		}

		suggested, confidence, confidenceScore, reasons := buildSuggestion(
			currentBudget,
			averageSpent,
			variableSpent,
			predictableSpend,
			outlierAdjusted,
			row,
		)

		direction := "keep"
		change := suggested - currentBudget
		if isMeaningfulChange(currentBudget, change) && suggested > currentBudget {
			direction = "increase"
		} else if isMeaningfulChange(currentBudget, change) && suggested < currentBudget {
			direction = "decrease"
		} else {
			suggested = currentBudget
			change = 0
		}

		out = append(out, CategoryBudgetSuggestion{
			CategoryID:              row.CategoryID,
			CategoryName:            row.CategoryName,
			CategoryColor:           row.CategoryColor,
			TrackingCadence:         currentProfile.TrackingCadence,
			CurrentBudgetCents:      currentBudget,
			SuggestedBudgetCents:    suggested,
			AverageSpentCents:       averageSpent,
			VariableSpentCents:      variableSpent,
			RecurringSpentCents:     recurringSpent,
			PredictableSpendCents:   predictableSpend,
			OutlierAdjustedCents:    outlierAdjusted,
			RecentSpentCents:        row.RecentSpentCents,
			LookbackDays:            lookbackDays,
			BasedOnTransactions:     row.TransactionCount,
			Confidence:              confidence,
			ConfidenceScore:         confidenceScore,
			Reason:                  primaryReason(reasons),
			Reasons:                 reasons,
			RecommendationDirection: direction,
			ChangeCents:             change,
			ChangePercent:           changePercent(currentBudget, change),
		})
	}

	out = fitSuggestionsToIncome(out, netIncomeBudget)

	var currentTotal int64
	var suggestedTotal int64
	for _, item := range out {
		currentTotal += item.CurrentBudgetCents
		suggestedTotal += item.SuggestedBudgetCents
	}

	summary := BudgetSuggestionSummary{
		TrackingCadence:           currentProfile.TrackingCadence,
		LookbackDays:              lookbackDays,
		SmartBudgetingEnabled:     true,
		NetIncomeBudgetCents:      netIncomeBudget,
		CurrentBudgetTotalCents:   currentTotal,
		SuggestedBudgetTotalCents: suggestedTotal,
		SuggestedRemainingCents:   netIncomeBudget - suggestedTotal,
	}
	if suggestedTotal > netIncomeBudget {
		summary.SuggestedOverIncomeCents = suggestedTotal - netIncomeBudget
		summary.NeedsIncomeFitReview = true
	}

	return BudgetSuggestionsResponse{
		Summary:           summary,
		BudgetSuggestions: out,
	}, nil
}

func suggestForCadence(recentSpentCents int64, lookbackDays int, trackingCadence string) int64 {
	if recentSpentCents <= 0 || lookbackDays <= 0 {
		return 0
	}

	daily := float64(recentSpentCents) / float64(lookbackDays)
	switch trackingCadence {
	case "monthly":
		return int64(math.Round(daily * 30.4375))
	default:
		return int64(math.Round(daily * 7.0))
	}
}

func buildSuggestion(currentBudget, averageSpent, variableSpent, predictableSpend, outlierAdjusted int64, row categoryHistoryRow) (int64, string, int, []string) {
	reasons := make([]string, 0, 4)
	score := 0

	switch {
	case row.TransactionCount >= 12:
		score += 35
		reasons = append(reasons, "strong transaction history")
	case row.TransactionCount >= 4:
		score += 22
		reasons = append(reasons, "moderate transaction history")
	case row.TransactionCount > 0:
		score += 10
		reasons = append(reasons, "limited transaction history")
	default:
		reasons = append(reasons, "not enough recent spending data")
	}

	if row.PositiveSpendDays >= 8 {
		score += 20
	} else if row.PositiveSpendDays >= 3 {
		score += 10
	}

	if predictableSpend > 0 {
		score += 25
		reasons = append(reasons, "includes active recurring expenses")
	}
	if currentBudget > 0 {
		score += 10
	}
	if row.OutlierAdjustedSpentCents > 0 && row.OutlierAdjustedSpentCents < row.RecentSpentCents {
		score += 10
		reasons = append(reasons, "large one-day spending spikes were softened")
	}
	if row.MaxDailySpendCents > 0 && row.RecentSpentCents > 0 && row.MaxDailySpendCents > row.RecentSpentCents/2 {
		score -= 10
		reasons = append(reasons, "recent spending is uneven")
	}
	score = clampInt(score, 0, 100)

	confidence := "low"
	switch {
	case score >= 70:
		confidence = "high"
	case score >= 40:
		confidence = "medium"
	}

	if row.TransactionCount == 0 && predictableSpend == 0 {
		return currentBudget, confidence, score, reasons
	}

	variableBase := variableSpent
	if outlierAdjusted > 0 {
		adjustedVariable := outlierAdjusted - predictableSpend
		if adjustedVariable < 0 {
			adjustedVariable = 0
		}
		variableBase = minInt64(variableSpent, adjustedVariable)
	}
	base := predictableSpend + variableBase
	if base == 0 {
		base = averageSpent
	}

	buffer := 1.00
	switch confidence {
	case "high":
		buffer = 1.05
	case "medium":
		buffer = 1.08
	case "low":
		buffer = 1.03
	}

	return roundToDollars(int64(math.Round(float64(base) * buffer))), confidence, score, reasons
}

func fitSuggestionsToIncome(items []CategoryBudgetSuggestion, netIncomeBudget int64) []CategoryBudgetSuggestion {
	if netIncomeBudget <= 0 {
		return items
	}

	var total int64
	var predictableTotal int64
	for _, item := range items {
		total += item.SuggestedBudgetCents
		predictableTotal += minInt64(item.PredictableSpendCents, item.SuggestedBudgetCents)
	}
	if total <= netIncomeBudget {
		return items
	}

	variableTotal := total - predictableTotal
	if variableTotal <= 0 {
		return items
	}

	availableVariable := netIncomeBudget - predictableTotal
	if availableVariable < 0 {
		availableVariable = 0
	}
	ratio := float64(availableVariable) / float64(variableTotal)

	for i := range items {
		fixed := minInt64(items[i].PredictableSpendCents, items[i].SuggestedBudgetCents)
		variable := items[i].SuggestedBudgetCents - fixed
		items[i].SuggestedBudgetCents = roundToDollars(fixed + int64(math.Round(float64(variable)*ratio)))
		items[i].ChangeCents = items[i].SuggestedBudgetCents - items[i].CurrentBudgetCents
		items[i].ChangePercent = changePercent(items[i].CurrentBudgetCents, items[i].ChangeCents)
		items[i].RecommendationDirection = "keep"
		if isMeaningfulChange(items[i].CurrentBudgetCents, items[i].ChangeCents) && items[i].ChangeCents > 0 {
			items[i].RecommendationDirection = "increase"
		} else if isMeaningfulChange(items[i].CurrentBudgetCents, items[i].ChangeCents) && items[i].ChangeCents < 0 {
			items[i].RecommendationDirection = "decrease"
		}
		items[i].Reasons = append(items[i].Reasons, "adjusted to fit net income")
		items[i].Reason = primaryReason(items[i].Reasons)
		if items[i].ConfidenceScore >= 10 {
			items[i].ConfidenceScore -= 10
		}
	}

	return items
}

func isMeaningfulChange(currentBudget, change int64) bool {
	absChange := absInt64(change)
	if absChange < 500 {
		return false
	}
	if currentBudget <= 0 {
		return absChange > 0
	}
	return (absChange * 100 / currentBudget) >= 5
}

func changePercent(currentBudget, change int64) int64 {
	if currentBudget <= 0 {
		if change == 0 {
			return 0
		}
		return 100
	}
	return int64(math.Round(float64(change) * 100 / float64(currentBudget)))
}

func primaryReason(reasons []string) string {
	if len(reasons) == 0 {
		return "based on recent spending"
	}
	return reasons[0]
}

func roundToDollars(value int64) int64 {
	if value <= 0 {
		return 0
	}
	return int64(math.Round(float64(value)/100.0)) * 100
}

func clampInt(value, minValue, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func maxInt64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

func minInt64(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}

func absInt64(value int64) int64 {
	if value < 0 {
		return -value
	}
	return value
}
