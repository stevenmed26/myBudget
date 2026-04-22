package recurring

import "time"

type Rule struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	CategoryID  string    `json:"category_id"`
	Name        string    `json:"name"`
	AmountCents int64     `json:"amount_cents"`
	RuleType    string    `json:"rule_type"`
	Frequency   string    `json:"frequency"`
	StartDate   string    `json:"start_date"`
	EndDate     *string   `json:"end_date,omitempty"`
	NextRunDate string    `json:"next_run_date"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateRuleRequest struct {
	CategoryID  string  `json:"category_id"`
	Name        string  `json:"name"`
	AmountCents int64   `json:"amount_cents"`
	RuleType    string  `json:"rule_type"`
	Frequency   string  `json:"frequency"`
	StartDate   string  `json:"start_date"`
	EndDate     *string `json:"end_date,omitempty"`
}

type UpdateRuleRequest struct {
	CategoryID  string  `json:"category_id"`
	Name        string  `json:"name"`
	AmountCents int64   `json:"amount_cents"`
	RuleType    string  `json:"rule_type"`
	Frequency   string  `json:"frequency"`
	StartDate   string  `json:"start_date"`
	EndDate     *string `json:"end_date,omitempty"`
	Active      bool    `json:"active"`
}

type SyncResult struct {
	CreatedTransactions int `json:"created_transactions"`
	AdvancedRules       int `json:"advanced_rules"`
}
