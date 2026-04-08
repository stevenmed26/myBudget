package transactions

import "time"

type Transaction struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	CategoryID      string     `json:"category_id"`
	AmountCents     int64      `json:"amount_cents"`
	TransactionType string     `json:"transaction_type"`
	TransactionDate string     `json:"transaction_date"`
	MerchantName    *string    `json:"merchant_name,omitempty"`
	Note            *string    `json:"note,omitempty"`
	Source          string     `json:"source"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty"`
}

type CreateTransactionRequest struct {
	CategoryID      string  `json:"category_id"`
	AmountCents     int64   `json:"amount_cents"`
	TransactionType string  `json:"transaction_type"`
	TransactionDate string  `json:"transaction_date"`
	MerchantName    *string `json:"merchant_name"`
	Note            *string `json:"note"`
}
