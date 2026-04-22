package recurring

import (
	"context"
	"fmt"
	"time"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/devlog"
	"mybudget-api/internal/profile"
)

type Service struct {
	repo        *Repository
	profileRepo *profile.Repository
}

func NewService(repo *Repository, profileRepo *profile.Repository) *Service {
	return &Service{repo: repo, profileRepo: profileRepo}
}

func (s *Service) SyncDueRules(ctx context.Context, throughDate string) (*SyncResult, error) {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("unauthorized")
	}
	return s.SyncDueRulesForUser(ctx, userID, throughDate)
}

func (s *Service) SyncDueRulesForUser(ctx context.Context, userID string, throughDate string) (*SyncResult, error) {
	if throughDate == "" {
		resolved, err := s.resolveTodayForUser(ctx, userID)
		if err != nil {
			return nil, err
		}
		throughDate = resolved
	}

	dueRules, err := s.repo.ListDueRules(ctx, userID, throughDate)
	if err != nil {
		return nil, err
	}

	result := &SyncResult{}
	for _, rule := range dueRules {
		created, advanced, err := s.repo.ApplyDueRule(ctx, userID, rule.ID, throughDate)
		if err != nil {
			return nil, err
		}
		result.CreatedTransactions += created
		if advanced {
			result.AdvancedRules++
		}
	}

	if result.CreatedTransactions > 0 || result.AdvancedRules > 0 {
		devlog.Infof(
			"recurring sync applied user_id=%s through_date=%s created_transactions=%d advanced_rules=%d",
			userID,
			throughDate,
			result.CreatedTransactions,
			result.AdvancedRules,
		)
	}

	return result, nil
}

func (s *Service) resolveTodayForUser(ctx context.Context, userID string) (string, error) {
	now := time.Now()
	currentProfile, err := s.profileRepo.GetCurrentByUser(ctx, userID)
	if err != nil {
		return "", err
	}
	if currentProfile != nil && currentProfile.Timezone != "" {
		if loc, err := time.LoadLocation(currentProfile.Timezone); err == nil {
			now = now.In(loc)
		}
	}
	return now.Format("2006-01-02"), nil
}
