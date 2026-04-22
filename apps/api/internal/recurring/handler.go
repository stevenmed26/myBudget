package recurring

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"mybudget-api/internal/auth"
	"mybudget-api/internal/categories"
	"mybudget-api/internal/httpx"
)

type Handler struct {
	repo         *Repository
	service      *Service
	categoryRepo *categories.Repository
}

func NewHandler(repo *Repository, service *Service, categoryRepo *categories.Repository) *Handler {
	return &Handler{repo: repo, service: service, categoryRepo: categoryRepo}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	items, err := h.repo.ListByUser(r.Context(), userID)
	if err != nil {
		httpx.WriteInternalError(w, "recurring rules list failed", err, "failed to load recurring rules")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"recurring_rules": items})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateRuleRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := validateCreateRuleRequest(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	owned, err := h.categoryRepo.ExistsOwnedByUser(r.Context(), req.CategoryID, userID)
	if err != nil {
		httpx.WriteInternalError(w, "recurring category ownership check failed", err, "failed to validate recurring rule category")
		return
	}
	if !owned {
		httpx.WriteError(w, http.StatusBadRequest, "invalid category_id")
		return
	}

	item, err := h.repo.Create(r.Context(), userID, req)
	if err != nil {
		httpx.WriteInternalError(w, "recurring rule create failed", err, "failed to create recurring rule")
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

	ruleID := strings.TrimSpace(chi.URLParam(r, "ruleID"))
	if ruleID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "ruleID is required")
		return
	}

	var req UpdateRuleRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validateUpdateRuleRequest(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	owned, err := h.categoryRepo.ExistsOwnedByUser(r.Context(), req.CategoryID, userID)
	if err != nil {
		httpx.WriteInternalError(w, "recurring category ownership check failed", err, "failed to validate recurring rule category")
		return
	}
	if !owned {
		httpx.WriteError(w, http.StatusBadRequest, "invalid category_id")
		return
	}

	item, err := h.repo.Update(r.Context(), userID, ruleID, req)
	if err != nil {
		if err == ErrRuleNotFound {
			httpx.WriteError(w, http.StatusNotFound, "recurring rule not found")
			return
		}
		httpx.WriteInternalError(w, "recurring rule update failed", err, "failed to update recurring rule")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, item)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	ruleID := strings.TrimSpace(chi.URLParam(r, "ruleID"))
	if ruleID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "ruleID is required")
		return
	}

	if err := h.repo.SoftDelete(r.Context(), userID, ruleID); err != nil {
		if err == ErrRuleNotFound {
			httpx.WriteError(w, http.StatusNotFound, "recurring rule not found")
			return
		}
		httpx.WriteInternalError(w, "recurring rule delete failed", err, "failed to delete recurring rule")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func validateCreateRuleRequest(req *CreateRuleRequest) error {
	req.CategoryID = strings.TrimSpace(req.CategoryID)
	req.Name = strings.TrimSpace(req.Name)
	req.RuleType = strings.TrimSpace(req.RuleType)
	req.Frequency = strings.TrimSpace(req.Frequency)
	req.StartDate = strings.TrimSpace(req.StartDate)

	if req.EndDate != nil {
		trimmed := strings.TrimSpace(*req.EndDate)
		req.EndDate = &trimmed
		if trimmed == "" {
			req.EndDate = nil
		}
	}

	if req.CategoryID == "" {
		return errString("category_id is required")
	}
	if req.Name == "" {
		return errString("name is required")
	}
	if req.AmountCents <= 0 {
		return errString("amount_cents must be greater than zero")
	}
	if !isAllowedRuleType(req.RuleType) {
		return errString("rule_type must be expense or income")
	}
	if !isAllowedFrequency(req.Frequency) {
		return errString("frequency must be weekly, biweekly, monthly, or yearly")
	}
	if req.StartDate == "" {
		req.StartDate = time.Now().Format("2006-01-02")
	}
	if !isValidISODate(req.StartDate) {
		return errString("start_date must be YYYY-MM-DD")
	}
	if req.EndDate != nil {
		if !isValidISODate(*req.EndDate) {
			return errString("end_date must be YYYY-MM-DD")
		}
		if *req.EndDate < req.StartDate {
			return errString("end_date must be on or after start_date")
		}
	}

	return nil
}

func validateUpdateRuleRequest(req *UpdateRuleRequest) error {
	createReq := CreateRuleRequest{
		CategoryID:  req.CategoryID,
		Name:        req.Name,
		AmountCents: req.AmountCents,
		RuleType:    req.RuleType,
		Frequency:   req.Frequency,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
	}
	if err := validateCreateRuleRequest(&createReq); err != nil {
		return err
	}

	req.CategoryID = createReq.CategoryID
	req.Name = createReq.Name
	req.AmountCents = createReq.AmountCents
	req.RuleType = createReq.RuleType
	req.Frequency = createReq.Frequency
	req.StartDate = createReq.StartDate
	req.EndDate = createReq.EndDate

	return nil
}

func isAllowedRuleType(value string) bool {
	switch value {
	case "expense", "income":
		return true
	default:
		return false
	}
}

func isAllowedFrequency(value string) bool {
	switch value {
	case "weekly", "biweekly", "monthly", "yearly":
		return true
	default:
		return false
	}
}

func isValidISODate(value string) bool {
	_, err := time.Parse("2006-01-02", value)
	return err == nil
}

type errString string

func (e errString) Error() string { return string(e) }
