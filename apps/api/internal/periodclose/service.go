package periodclose

import (
	"context"
	"fmt"
	"time"

	"mybudget-api/internal/home"
	"mybudget-api/internal/periods"
	"mybudget-api/internal/auth"
)

type Service struct {
	repo        *Repository
	homeService *home.Service
}

func NewService(repo *Repository, homeService *home.Service) *Service {
	return &Service{
		repo:        repo,
		homeService: homeService,
	}
}

func (s *Service) CloseCurrentPeriod(ctx context.Context) (*ClosePeriodResponse, error) {
	homeSummary, err := s.homeService.BuildHomeSummary(ctx)
	if err != nil {
		return nil, err
	}

	periodRow, err := s.repo.GetOrCreatePeriod(
		ctx,
		auth.UserIDFromContext(r.Context()),
		homeSummary.PeriodStart,
		homeSummary.PeriodEnd,
		homeSummary.TrackingCadence,
	)
	if err != nil {
		return nil, err
	}

	if periodRow.Status == "closed" {
		resp := &ClosePeriodResponse{
			PeriodStart:          periodRow.StartDate,
			PeriodEnd:            periodRow.EndDate,
			Status:               "closed",
			NetIncomeBudgetCents: homeSummary.NetIncomeBudgetCents,
			SpentAmountCents:     homeSummary.SpentAmountCents,
			LeftoverAmountCents:  homeSummary.RemainingAmountCents,
			AlreadyClosed:        true,
		}
		if periodRow.SavedRolloverTransactionID != nil {
			resp.SavedTransactionID = *periodRow.SavedRolloverTransactionID
		}
		return resp, nil
	}

	leftover := homeSummary.RemainingAmountCents
	var savedTransactionID *string

	if leftover > 0 {
		savedCategoryID, err := s.repo.GetSavedCategoryID(ctx, auth.UserIDFromContext(r.Context()))
		if err != nil {
			return nil, err
		}

		note := fmt.Sprintf(
			"Automatic Saved rollover for %s to %s",
			homeSummary.PeriodStart,
			homeSummary.PeriodEnd,
		)
		id, err := s.repo.InsertSavedRolloverTransaction(
			ctx,
			auth.UserIDFromContext(r.Context()),
			savedCategoryID,
			leftover,
			homeSummary.PeriodEnd,
			note,
		)
		if err != nil {
			return nil, err
		}
		savedTransactionID = &id
	}

	if err := s.repo.ClosePeriod(ctx, periodRow.ID, savedTransactionID); err != nil {
		return nil, err
	}

	resp := &ClosePeriodResponse{
		PeriodStart:          periodRow.StartDate,
		PeriodEnd:            periodRow.EndDate,
		Status:               "closed",
		NetIncomeBudgetCents: homeSummary.NetIncomeBudgetCents,
		SpentAmountCents:     homeSummary.SpentAmountCents,
		LeftoverAmountCents:  leftover,
		AlreadyClosed:        false,
	}
	if savedTransactionID != nil {
		resp.SavedTransactionID = *savedTransactionID
	}

	return resp, nil
}

func (s *Service) CurrentPeriod(now time.Time, cadence string, weekStartsOn int, monthlyAnchorDay int) periods.CurrentPeriod {
	return periods.GetCurrentPeriod(now, cadence, weekStartsOn, monthlyAnchorDay)
}
