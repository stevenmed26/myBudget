package home

import (
	"net/http"

	"mybudget-api/internal/httpx"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.BuildHomeSummary(r.Context())
	if err != nil {
		httpx.WriteInternalError(w, "home summary failed", err, "failed to build home summary")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, item)
}
