package home

import (
	"net/http"

	"mybudget-api/internal/httpx"
	"mybudget-api/internal/recurring"
)

type Handler struct {
	service          *Service
	recurringService *recurring.Service
}

func NewHandler(service *Service, recurringService *recurring.Service) *Handler {
	return &Handler{
		service:          service,
		recurringService: recurringService,
	}
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	if h.recurringService != nil {
		if _, err := h.recurringService.SyncDueRules(r.Context(), ""); err != nil {
			httpx.WriteInternalError(w, "recurring sync before home summary failed", err, "failed to build home summary")
			return
		}
	}
	item, err := h.service.BuildHomeSummary(r.Context())
	if err != nil {
		httpx.WriteInternalError(w, "home summary failed", err, "failed to build home summary")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, item)
}
