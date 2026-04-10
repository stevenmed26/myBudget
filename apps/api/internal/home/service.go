package home

import (
	"context"
	"time"

	"mybudget-api/internal/periods"
	"mybudget-api/internal/profile"
	"mybudget-api/pkg/normalize"
)

type Service struct {
	repo        *Repository
	profileRepo *profile.Repository
	demoUserID  string
}

func NewService(repo *Repository, profileRepo *profile.Repository, demoUserID string) *Service {
	return &Service{
		repo:        repo,
		profileRepo: profileRepo,
		demoUserID:  demoUserID,
	}
}

func (s *Service) BuildHomeSummary(ctx context.Context) (*HomeSummary, error) {
	currentProfile, err := s.profileRepo.GetCurrentByUser(ctx, s.demoUserID)
	if err != nil {
		return nil, err
	}

	current := periods.GetCurrentPeriod(
		time.Now(),
		currentProfile.TrackingCadence,
		currentProfile.WeekStartsOn,
		currentProfile.MonthlyAnchorDay,
	)

	activeProfile, err := s.profileRepo.GetVersionForDate(ctx, s.demoUserID, current.StartDate)
	if err != nil {
		return nil, err
	}

	categoryRows, err := s.repo.GetCategorySpendRows(ctx, s.demoUserID, current.StartDate, current.EndDate)
	if err != nil {
		return nil, err
	}

	incomeBudget, err := normalize.ConvertAmount(
		activeProfile.IncomeAmountCents,
		normalize.Cadence(activeProfile.IncomeCadence),
		normalize.Cadence(activeProfile.TrackingCadence),
	)
	if err != nil {
		return nil, err
	}

	netIncomeBudget := incomeBudget - ((incomeBudget * int64(activeProfile.EstimatedTaxRateBps)) / 10000)

	var categoryItems []CategoryProgress
	var totalSpent int64

	for _, row := range categoryRows {
		budgetAmount := row.BudgetAmountCents
		if row.BudgetCadence != nil && *row.BudgetCadence != "" {
			converted, err := normalize.ConvertAmount(
				row.BudgetAmountCents,
				normalize.Cadence(*row.BudgetCadence),
				normalize.Cadence(activeProfile.TrackingCadence),
			)
			if err == nil {
				budgetAmount = converted
			}
		}

		remaining := budgetAmount - row.SpentAmountCents
		percentUsed := int64(0)
		if budgetAmount > 0 {
			percentUsed = (row.SpentAmountCents * 100) / budgetAmount
		}

		if row.CountsTowardBudget {
			totalSpent += row.SpentAmountCents
		}

		categoryItems = append(categoryItems, CategoryProgress{
			CategoryID:           row.CategoryID,
			CategoryName:         row.CategoryName,
			CategoryColor:        row.CategoryColor,
			CountsTowardBudget:   row.CountsTowardBudget,
			BudgetAmountCents:    budgetAmount,
			SpentAmountCents:     row.SpentAmountCents,
			RemainingAmountCents: remaining,
			PercentUsed:          percentUsed,
		})
	}

	return &HomeSummary{
		PeriodStart:           current.StartDate,
		PeriodEnd:             current.EndDate,
		TrackingCadence:       activeProfile.TrackingCadence,
		NetIncomeBudgetCents:  netIncomeBudget,
		SpentAmountCents:      totalSpent,
		RemainingAmountCents:  netIncomeBudget - totalSpent,
		CategoryProgressItems: categoryItems,
	}, nil
}
