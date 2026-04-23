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
	"mybudget-api/internal/profile"
	"mybudget-api/internal/recurring"
)

type Handler struct {
	repo             *Repository
	categoryRepo     *categories.Repository
	profileRepo      *profile.Repository
	recurringService *recurring.Service
}

func NewHandler(repo *Repository, categoryRepo *categories.Repository, profileRepo *profile.Repository, recurringService *recurring.Service) *Handler {
	return &Handler{
		repo:             repo,
		categoryRepo:     categoryRepo,
		profileRepo:      profileRepo,
		recurringService: recurringService,
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
		currentProfile, err := h.profileRepo.GetCurrentByUser(r.Context(), userID)
		if err != nil {
			httpx.WriteInternalError(w, "transactions profile lookup failed", err, "failed to load transactions")
			return
		}
		if currentProfile == nil {
			httpx.WriteError(w, http.StatusBadRequest, "budget profile not found")
			return
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
		startDate = current.StartDate
		endDate = current.EndDate
	}

	if !isValidISODate(startDate) || !isValidISODate(endDate) {
		httpx.WriteError(w, http.StatusBadRequest, "start_date and end_date must be YYYY-MM-DD")
		return
	}
	if startDate > endDate {
		httpx.WriteError(w, http.StatusBadRequest, "start_date must be on or before end_date")
		return
	}

	if h.recurringService != nil {
		if _, err := h.recurringService.SyncDueRules(r.Context(), ""); err != nil {
			httpx.WriteInternalError(w, "recurring sync before transactions failed", err, "failed to load transactions")
			return
		}
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

	if !h.prepareTransactionRequest(w, r, userID, &req) {
		return
	}

	item, err := h.repo.Create(r.Context(), userID, req)
	if err != nil {
		httpx.WriteInternalError(w, "transaction create failed", err, "failed to create transaction")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, item)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
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

	var req UpdateTransactionRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.CategoryID = strings.TrimSpace(req.CategoryID)
	req.TransactionType = strings.TrimSpace(req.TransactionType)
	req.TransactionDate = strings.TrimSpace(req.TransactionDate)

	if !h.prepareTransactionRequest(w, r, userID, &req) {
		return
	}

	item, err := h.repo.Update(r.Context(), userID, transactionID, req)
	if err != nil {
		if err == ErrTransactionNotFound {
			httpx.WriteError(w, http.StatusNotFound, "transaction not found")
			return
		}
		httpx.WriteInternalError(w, "transaction update failed", err, "failed to update transaction")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, item)
}

func (h *Handler) prepareTransactionRequest(w http.ResponseWriter, r *http.Request, userID string, req *CreateTransactionRequest) bool {
	if req.CategoryID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "category_id is required")
		return false
	}
	if req.AmountCents <= 0 {
		httpx.WriteError(w, http.StatusBadRequest, "amount_cents must be greater than zero")
		return false
	}

	switch req.TransactionType {
	case "", "expense":
		if req.TransactionType == "" {
			req.TransactionType = "expense"
		}
	case "income":
	default:
		httpx.WriteError(w, http.StatusBadRequest, "transaction_type must be expense or income")
		return false
	}

	if req.TransactionDate == "" {
		req.TransactionDate = time.Now().Format("2006-01-02")
	}
	if !isValidISODate(req.TransactionDate) {
		httpx.WriteError(w, http.StatusBadRequest, "transaction_date must be YYYY-MM-DD")
		return false
	}

	owned, err := h.categoryRepo.ExistsOwnedByUser(r.Context(), req.CategoryID, userID)
	if err != nil {
		httpx.WriteInternalError(w, "transaction category ownership check failed", err, "failed to validate category")
		return false
	}
	if !owned {
		httpx.WriteError(w, http.StatusBadRequest, "invalid category_id")
		return false
	}

	return true
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

func isValidISODate(value string) bool {
	_, err := time.Parse("2006-01-02", value)
	return err == nil
}

func isAllowedUserTransactionType(value string) bool {
	switch value {
	case "expense", "income":
		return true
	default:
		return false
	}
}
