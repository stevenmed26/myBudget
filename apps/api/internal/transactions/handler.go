package transactions

import (
	"mybudget-api/internal/httpx"
	"mybudget-api/internal/periods"
	"mybudget-api/internal/auth"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	repo       *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{
		repo:       repo,

	}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	if startDate == "" || endDate == "" {
		current := periods.GetCurrentPeriod(time.Now(), "weekly", 1, 1)
		startDate = current.StartDate
		endDate = current.EndDate
	}

	items, err := h.repo.ListByUserAndDateRange(r.Context(), auth.UserIDFromContext(r.Context()), startDate, endDate)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"transactions": items,
	})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateTransactionRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
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

	item, err := h.repo.Create(r.Context(), auth.UserIDFromContext(r.Context()), req)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, item)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	transactionID := chi.URLParam(r, "transactionID")
	if strings.TrimSpace(transactionID) == "" {
		httpx.WriteError(w, http.StatusBadRequest, "transactionID is required")
		return
	}

	if err := h.repo.SoftDelete(r.Context(), auth.UserIDFromContext(r.Context()), transactionID); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"deleted": true,
	})
}
