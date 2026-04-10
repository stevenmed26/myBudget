package periodclose

import (
	"mybudget-api/internal/httpx"
	"net/http"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) CloseCurrent(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.CloseCurrentPeriod(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, item)
}
