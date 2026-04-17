package periodclose

import (
	"context"
	"fmt"

	"mybudget-api/internal/home"
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
		homeSummary.UserID,
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
	var savedCategoryID *string

	if leftover > 0 {
		id, err := s.repo.GetSavedCategoryID(ctx, homeSummary.UserID)
		if err != nil {
			return nil, err
		}
		savedCategoryID = &id
	}

	note := fmt.Sprintf(
		"Automatic Saved rollover for %s to %s",
		homeSummary.PeriodStart,
		homeSummary.PeriodEnd,
	)

	savedTransactionID, err := s.repo.FinalizePeriod(
		ctx,
		periodRow.ID,
		homeSummary.UserID,
		savedCategoryID,
		leftover,
		homeSummary.PeriodEnd,
		note,
	)
	if err != nil {
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
