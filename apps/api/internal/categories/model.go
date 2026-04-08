package categories

import (
	"time"
)

type Category struct {
	ID                 string     `json:"id"`
	UserID             string     `json:"user_id"`
	Name               string     `json:"name"`
	Color              string     `json:"color"`
	Icon               *string    `json:"icon,omitempty"`
	IsDefault          bool       `json:"is_default"`
	CountsTowardBudget bool       `json:"counts_toward_budget"`
	IsSystem           bool       `json:"is_system"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	ArchivedAt         *time.Time `json:"archived_at,omitempty"`
}

type CreateCategoryRequest struct {
	Name               string  `json:"name"`
	Color              string  `json:"color"`
	Icon               *string `json:"icon,omitempty"`
	CountsTowardBudget bool    `json:"counts_toward_budget"`
}
