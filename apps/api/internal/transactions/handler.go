package transactions

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/categories"
	"mybudget-api/internal/httpx"
	"mybudget-api/internal/periods"
)

type Handler struct {
	repo         *Repository
	categoryRepo *categories.Repository
}

func NewHandler(repo *Repository, categoryRepo *categories.Repository) *Handler {
	return &Handler{
		repo:         repo,
		categoryRepo: categoryRepo,
	}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	if startDate == "" || endDate == "" {
		current := periods.GetCurrentPeriod(time.Now(), "weekly", 1, 1)
		startDate = current.StartDate
		endDate = current.EndDate
	}

	items, err := h.repo.ListByUserAndDateRange(r.Context(), userID, startDate, endDate)
	if err != nil {
		httpx.WriteInternalError(w, "transactions list failed", err, "failed to load transactions")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"transactions": items,
	})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateTransactionRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.CategoryID = strings.TrimSpace(req.CategoryID)
	req.TransactionType = strings.TrimSpace(req.TransactionType)
	req.TransactionDate = strings.TrimSpace(req.TransactionDate)

	if req.CategoryID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "category_id is required")
		return
	}
	if req.AmountCents == 0 {
		httpx.WriteError(w, http.StatusBadRequest, "amount_cents cannot be zero")
		return
	}
	if req.TransactionType == "" {
		req.TransactionType = "expense"
	}
	if req.TransactionDate == "" {
		req.TransactionDate = time.Now().Format("2006-01-02")
	}

	owned, err := h.categoryRepo.ExistsOwnedByUser(r.Context(), req.CategoryID, userID)
	if err != nil {
		httpx.WriteInternalError(w, "transaction category ownership check failed", err, "failed to validate category")
		return
	}
	if !owned {
		httpx.WriteError(w, http.StatusBadRequest, "invalid category_id")
		return
	}

	item, err := h.repo.Create(r.Context(), userID, req)
	if err != nil {
		httpx.WriteInternalError(w, "transaction create failed", err, "failed to create transaction")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, item)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	transactionID := chi.URLParam(r, "transactionID")
	if strings.TrimSpace(transactionID) == "" {
		httpx.WriteError(w, http.StatusBadRequest, "transactionID is required")
		return
	}

	if err := h.repo.SoftDelete(r.Context(), userID, transactionID); err != nil {
		httpx.WriteInternalError(w, "transaction delete failed", err, "failed to delete transaction")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"deleted": true,
	})
}