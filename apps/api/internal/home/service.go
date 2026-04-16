package home

import (
	"context"
	"fmt"
	"time"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/periods"
	"mybudget-api/internal/profile"
	"mybudget-api/pkg/normalize"
)

type Service struct {
	repo        *Repository
	profileRepo *profile.Repository
}

func NewService(repo *Repository, profileRepo *profile.Repository) *Service {
	return &Service{
		repo:        repo,
		profileRepo: profileRepo,
	}
}

func (s *Service) BuildHomeSummary(ctx context.Context) (*HomeSummary, error) {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("unauthorized")
	}

	currentProfile, err := s.profileRepo.GetCurrentByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if currentProfile == nil {
		return nil, fmt.Errorf("no budget profile version found for user")
	}

	now := time.Now()
	if currentProfile.Timezone != "" {
		if loc, err := time.LoadLocation(currentProfile.Timezone); err == nil {
			now = now.In(loc)
		}
	}

	current := periods.GetCurrentPeriod(
		now,
		currentProfile.TrackingCadence,
		currentProfile.WeekStartsOn,
		currentProfile.MonthlyAnchorDay,
	)

	activeProfile, err := s.profileRepo.GetVersionForDate(ctx, userID, current.StartDate)
	if err != nil {
		return nil, err
	}
	if activeProfile == nil {
		return nil, fmt.Errorf("no active budget profile version found for current period")
	}

	categoryRows, err := s.repo.GetCategorySpendRows(ctx, userID, current.StartDate, current.EndDate)
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
		UserID:                userID,
		PeriodStart:           current.StartDate,
		PeriodEnd:             current.EndDate,
		TrackingCadence:       activeProfile.TrackingCadence,
		NetIncomeBudgetCents:  netIncomeBudget,
		SpentAmountCents:      totalSpent,
		RemainingAmountCents:  netIncomeBudget - totalSpent,
		CategoryProgressItems: categoryItems,
	}, nil
}