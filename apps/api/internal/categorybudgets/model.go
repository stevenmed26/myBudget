package categorybudgets

import (
	"time"
)

type CategoryBudget struct {
	ID            string    `json:"id"`
	CategoryID    string    `json:"category_id"`
	AmountCents   int64     `json:"amount_cents"`
	Cadence       string    `json:"cadence"`
	EffectiveFrom string    `json:"effective_from"`
	EffectiveTo   *string   `json:"effective_to,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type UpsertCategoryBudgetRequest struct {
	CategoryID    string `json:"category_id"`
	AmountCents   int64  `json:"amount_cents"`
	Cadence       string `json:"cadence"`
	EffectiveFrom string `json:"effective_from"`
}
